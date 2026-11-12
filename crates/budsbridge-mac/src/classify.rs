//! Platform-independent rules for turning IOBluetooth's paired-device records
//! into BudsBridge devices, and macOS' answers into messages. Kept apart from
//! the FFI so it is tested on every OS.

use budsbridge_core::{
    AudioDevice, AudioProfile, BackendError, UnavailableReason, UnavailableSource,
};
use serde::Deserialize;

/// Bluetooth SIG 16-bit service classes read from a device's SDP records.
pub mod service {
    pub const HEADSET: u16 = 0x1108;
    pub const AUDIO_SOURCE: u16 = 0x110A;
    pub const AUDIO_SINK: u16 = 0x110B;
    pub const HEADSET_AUDIO_GATEWAY: u16 = 0x1112;
    pub const HANDS_FREE: u16 = 0x111E;
    pub const HANDS_FREE_AUDIO_GATEWAY: u16 = 0x111F;
}

/// Major device classes (Bluetooth Assigned Numbers, Class of Device).
const MAJOR_MISC: u32 = 0x00;
const MAJOR_PHONE: u32 = 0x02;
const MAJOR_AUDIO_VIDEO: u32 = 0x04;
const MAJOR_WEARABLE: u32 = 0x07;
const MAJOR_UNCATEGORIZED: u32 = 0x1F;

/// Audio/video minor classes that play sound: uncategorized, wearable
/// headset, hands-free, loudspeaker, headphones, portable audio, car audio,
/// hi-fi audio, and video display with loudspeaker.
const AUDIO_OUTPUT_MINORS: [u32; 9] = [0, 1, 2, 5, 6, 7, 8, 10, 15];

/// One paired device as `bluetooth.m` reports it.
#[derive(Debug, Clone, PartialEq, Eq, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PairedDevice {
    /// IOBluetooth's address string, e.g. `"a1-b2-c3-d4-e5-f6"`.
    pub address: String,
    pub name: String,
    pub connected: bool,
    #[serde(default)]
    pub class_of_device: u32,
    /// Service classes found in the cached SDP records; may be empty.
    #[serde(default)]
    pub services: Vec<u16>,
}

/// What a paired device is, as far as BudsBridge cares.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Kind {
    /// Buds, headphones, speakers.
    AudioOutput,
    Phone,
    Other,
}

impl PairedDevice {
    pub fn major_class(&self) -> u32 {
        (self.class_of_device >> 8) & 0x1F
    }

    pub fn minor_class(&self) -> u32 {
        (self.class_of_device >> 2) & 0x3F
    }

    fn offers(&self, service: u16) -> bool {
        self.services.contains(&service)
    }

    fn offers_playback(&self) -> bool {
        self.offers(service::AUDIO_SINK)
            || self.offers(service::HANDS_FREE)
            || self.offers(service::HEADSET)
    }

    /// The class of device decides; the services break ties for devices
    /// whose class says little (some buds report "uncategorized" or
    /// "wearable"). A computer that offers an audio sink, like a Windows PC
    /// with BudsBridge, is not buds.
    pub fn kind(&self) -> Kind {
        match self.major_class() {
            MAJOR_PHONE => Kind::Phone,
            MAJOR_AUDIO_VIDEO if AUDIO_OUTPUT_MINORS.contains(&self.minor_class()) => {
                Kind::AudioOutput
            }
            MAJOR_AUDIO_VIDEO | MAJOR_MISC | MAJOR_WEARABLE | MAJOR_UNCATEGORIZED
                if self.offers_playback() =>
            {
                Kind::AudioOutput
            }
            _ => Kind::Other,
        }
    }

    /// Stereo for an A2DP sink, Hands-free for HFP/HSP. Before macOS has
    /// read the device's services the list is empty; it is then shown as
    /// stereo, which is what buds are bought for.
    pub fn profiles(&self) -> Vec<AudioProfile> {
        let mut profiles = Vec::new();
        if self.offers(service::AUDIO_SINK) {
            profiles.push(AudioProfile::Stereo);
        }
        if self.offers(service::HANDS_FREE) || self.offers(service::HEADSET) {
            profiles.push(AudioProfile::HandsFree);
        }
        if profiles.is_empty() {
            profiles.push(AudioProfile::Stereo);
        }
        profiles
    }

    pub fn display_name(&self) -> String {
        let name = self.name.trim();
        if name.is_empty() {
            self.address.clone()
        } else {
            name.to_owned()
        }
    }

    pub fn is(&self, address: &str) -> bool {
        self.address.eq_ignore_ascii_case(address)
    }
}

/// Parses `bb_paired_devices_json`.
pub fn parse(json: &str) -> Result<Vec<PairedDevice>, serde_json::Error> {
    serde_json::from_str(json)
}

/// Paired buds, headphones and speakers, sorted by name.
pub fn audio_devices(paired: &[PairedDevice]) -> Vec<AudioDevice> {
    let mut devices: Vec<AudioDevice> = paired
        .iter()
        .filter(|device| device.kind() == Kind::AudioOutput)
        .map(|device| {
            AudioDevice::new(
                device.address.clone(),
                device.display_name(),
                device.connected,
            )
            .with_profiles(device.profiles())
        })
        .collect();
    devices.sort_by_key(|device| device.name.to_lowercase());
    devices
}

/// Paired phones, which macOS can't receive Bluetooth audio from.
pub fn unavailable_phones(paired: &[PairedDevice]) -> Vec<UnavailableSource> {
    let mut phones: Vec<UnavailableSource> = paired
        .iter()
        .filter(|device| device.kind() == Kind::Phone)
        .map(|device| {
            UnavailableSource::new(device.display_name(), UnavailableReason::NotSupportedByOs)
        })
        .collect();
    phones.sort_by_key(|phone| phone.name.to_lowercase());
    phones
}

/// Bluetooth on this Mac, as `bb_bluetooth_state_json` reports it.
#[derive(Debug, Clone, Default, PartialEq, Eq, Deserialize)]
#[serde(default)]
pub struct BluetoothState {
    /// `on`, `off` or `unavailable` (no Bluetooth hardware, or not ready).
    pub power: String,
    /// `allowed`, `denied`, `restricted`, `notDetermined` or `unknown`.
    pub access: String,
    /// e.g. `Version 15.1 (Build 24B83)`.
    pub os: String,
}

pub const ACCESS_DENIED: &str = "BudsBridge isn't allowed to use Bluetooth. Allow it in System Settings → Privacy & Security → Bluetooth, then open BudsBridge again.";
pub const BLUETOOTH_OFF: &str =
    "Bluetooth is off. Turn it on in Control Center or System Settings → Bluetooth.";
pub const NO_BLUETOOTH: &str = "This Mac's Bluetooth isn't available right now.";
/// Why bridge mode can't work on a Mac.
pub const NO_PHONE_AUDIO: &str = "macOS can't play a phone's audio over Bluetooth. An iPhone can use AirPlay to this Mac instead.";

impl BluetoothState {
    /// Why BudsBridge can't connect anything right now, if it can't.
    pub fn problem(&self) -> Option<BackendError> {
        let message = match (self.access.as_str(), self.power.as_str()) {
            ("denied" | "restricted", _) => ACCESS_DENIED,
            (_, "off") => BLUETOOTH_OFF,
            (_, "unavailable") => NO_BLUETOOTH,
            _ => return None,
        };
        Some(BackendError::NotSupported(message.to_owned()))
    }

    /// `"15.1"` from `"Version 15.1 (Build 24B83)"`.
    pub fn version(&self) -> Option<&str> {
        let rest = self.os.strip_prefix("Version ")?;
        let version = rest.split_whitespace().next()?;
        (!version.is_empty()).then_some(version)
    }
}

/// Parses `bb_bluetooth_state_json`; anything unreadable is "unknown".
pub fn parse_state(json: &str) -> BluetoothState {
    serde_json::from_str(json).unwrap_or_else(|_| BluetoothState {
        power: "unknown".into(),
        access: "unknown".into(),
        os: String::new(),
    })
}

/// Returned by `bb_open_connection` / `bb_close_connection` when no paired
/// device has the address.
pub const NOT_FOUND: i32 = -1;

/// A readable message for an IOReturn (or Bluetooth HCI) error code.
pub fn error_message(code: i32) -> String {
    // IOReturn values are 0xE00002xx; reinterpret the sign bit.
    let message = match code as u32 {
        0xE000_02D6 | 0x04 | 0x08 | 0x10 => {
            "The buds didn't answer. Check they are on, out of the case and in range."
        }
        0xE000_02C0 => "The buds aren't available. Check they are on and in range.",
        0xE000_02D5 | 0x0B | 0x0C => {
            "The buds are busy, probably with another device. Release them there first."
        }
        0xE000_02E2 | 0xE000_02C1 => {
            "macOS didn't allow it. Check BudsBridge may use Bluetooth in System Settings → Privacy & Security → Bluetooth."
        }
        0x05 | 0x06 => {
            "Pairing with the buds failed. Remove them in System Settings → Bluetooth and pair again."
        }
        _ => "",
    };
    if message.is_empty() {
        format!("macOS Bluetooth error {:#010x}", code as u32)
    } else {
        format!("{message} (error {:#x})", code as u32)
    }
}

/// The macOS part of "Copy diagnostics": what IOBluetooth reports, without
/// device addresses.
pub fn diagnostics(
    state: &BluetoothState,
    paired: Option<&[PairedDevice]>,
    airplay: Option<bool>,
) -> String {
    let mut lines = vec![
        format!(
            "macOS: {}",
            if state.os.is_empty() {
                "unknown"
            } else {
                &state.os
            }
        ),
        format!("Bluetooth: power {} · access {}", state.power, state.access),
        format!(
            "AirPlay Receiver: {}",
            match airplay {
                Some(true) => "on",
                Some(false) => "off",
                None => "not set (macOS default)",
            }
        ),
    ];
    match paired {
        None => lines.push("Paired devices: could not be read".into()),
        Some(paired) => {
            lines.push(format!("Paired devices ({}):", paired.len()));
            for device in paired {
                let services: Vec<String> = device
                    .services
                    .iter()
                    .map(|service| format!("{service:04x}"))
                    .collect();
                lines.push(format!(
                    "  {} · {} · class {:#08x} · services {} · {}",
                    device.display_name(),
                    match device.kind() {
                        Kind::AudioOutput => "audio",
                        Kind::Phone => "phone",
                        Kind::Other => "other",
                    },
                    device.class_of_device,
                    if services.is_empty() {
                        "none cached".to_owned()
                    } else {
                        services.join(" ")
                    },
                    if device.connected {
                        "connected"
                    } else {
                        "not connected"
                    }
                ));
            }
        }
    }
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    fn device(name: &str, class_of_device: u32, services: &[u16]) -> PairedDevice {
        PairedDevice {
            address: format!("{}-00", name.to_lowercase()),
            name: name.to_owned(),
            connected: false,
            class_of_device,
            services: services.to_vec(),
        }
    }

    // Real classes of device: service bits, then major, then minor.
    const HEADPHONES: u32 = 0x24_0418; // audio/video, headphones
    const HEADSET: u32 = 0x24_0404; // audio/video, wearable headset
    const SMARTPHONE: u32 = 0x5A_020C; // phone, smartphone
    const LAPTOP: u32 = 0x3A_010C; // computer, laptop
    const KEYBOARD: u32 = 0x00_2540; // peripheral, keyboard
    const MICROPHONE: u32 = 0x20_0410; // audio/video, microphone

    #[test]
    fn class_of_device_fields() {
        let buds = device("Buds", HEADPHONES, &[]);
        assert_eq!(buds.major_class(), 0x04);
        assert_eq!(buds.minor_class(), 0x06);
        let phone = device("Phone", SMARTPHONE, &[]);
        assert_eq!(phone.major_class(), 0x02);
        assert_eq!(phone.minor_class(), 0x03);
    }

    #[test]
    fn kinds() {
        assert_eq!(device("A", HEADPHONES, &[]).kind(), Kind::AudioOutput);
        assert_eq!(device("B", HEADSET, &[]).kind(), Kind::AudioOutput);
        assert_eq!(
            device("C", SMARTPHONE, &[service::AUDIO_SOURCE]).kind(),
            Kind::Phone
        );
        assert_eq!(device("D", KEYBOARD, &[]).kind(), Kind::Other);
        assert_eq!(device("E", MICROPHONE, &[]).kind(), Kind::Other);
        // A microphone that also plays (a speakerphone) counts.
        assert_eq!(
            device("F", MICROPHONE, &[service::HANDS_FREE]).kind(),
            Kind::AudioOutput
        );
    }

    #[test]
    fn vague_classes_are_decided_by_services() {
        let uncategorized = 0x1F00;
        assert_eq!(
            device("Buds", uncategorized, &[service::AUDIO_SINK]).kind(),
            Kind::AudioOutput
        );
        assert_eq!(device("Thing", uncategorized, &[]).kind(), Kind::Other);
        let wearable = 0x0704;
        assert_eq!(
            device("Buds", wearable, &[service::HANDS_FREE]).kind(),
            Kind::AudioOutput
        );
        // A Windows PC can offer an audio sink; it is still not buds.
        assert_eq!(
            device("PC", LAPTOP, &[service::AUDIO_SINK]).kind(),
            Kind::Other
        );
    }

    #[test]
    fn profiles_from_services() {
        assert_eq!(
            device("A", HEADPHONES, &[service::HANDS_FREE, service::AUDIO_SINK]).profiles(),
            vec![AudioProfile::Stereo, AudioProfile::HandsFree]
        );
        assert_eq!(
            device("B", HEADSET, &[service::HEADSET]).profiles(),
            vec![AudioProfile::HandsFree]
        );
        assert_eq!(
            device("C", HEADPHONES, &[]).profiles(),
            vec![AudioProfile::Stereo]
        );
    }

    #[test]
    fn audio_devices_are_buds_only_sorted_by_name() {
        let mut zed = device("zed Buds", HEADPHONES, &[service::AUDIO_SINK]);
        zed.connected = true;
        let paired = [
            zed,
            device("Pixel", SMARTPHONE, &[]),
            device("Arc Headphones", HEADSET, &[]),
            device("Keys", KEYBOARD, &[]),
        ];
        let devices = audio_devices(&paired);
        assert_eq!(
            devices,
            vec![
                AudioDevice::new("arc headphones-00", "Arc Headphones", false),
                AudioDevice::new("zed buds-00", "zed Buds", true),
            ]
        );
    }

    #[test]
    fn phones_are_listed_as_unavailable() {
        let paired = [
            device("Pixel 7", SMARTPHONE, &[service::AUDIO_SOURCE]),
            device("Buds", HEADPHONES, &[]),
            device("iPhone", SMARTPHONE, &[]),
        ];
        assert_eq!(
            unavailable_phones(&paired),
            vec![
                UnavailableSource::new("iPhone", UnavailableReason::NotSupportedByOs),
                UnavailableSource::new("Pixel 7", UnavailableReason::NotSupportedByOs),
            ]
        );
    }

    #[test]
    fn blank_names_fall_back_to_the_address() {
        let mut buds = device("Buds", HEADPHONES, &[]);
        buds.name = "  ".into();
        assert_eq!(buds.display_name(), "buds-00");
        assert!(buds.is("BUDS-00"));
    }

    #[test]
    fn parses_the_objective_c_json() {
        let json = r#"[
            {"address":"a1-b2-c3-d4-e5-f6","name":"TWS","connected":true,
             "classOfDevice":2360344,"services":[4363,4382]},
            {"address":"00-11-22-33-44-55","name":"Pixel 7","connected":false}
        ]"#;
        let paired = parse(json).unwrap();
        assert_eq!(paired.len(), 2);
        assert_eq!(paired[0].class_of_device, HEADPHONES);
        assert_eq!(
            paired[0].services,
            vec![service::AUDIO_SINK, service::HANDS_FREE]
        );
        assert_eq!(paired[1].class_of_device, 0);
        assert!(paired[1].services.is_empty());
        assert!(parse("not json").is_err());
    }

    #[test]
    fn bluetooth_state_problems() {
        let state = |power: &str, access: &str| BluetoothState {
            power: power.into(),
            access: access.into(),
            os: String::new(),
        };
        assert_eq!(state("on", "allowed").problem(), None);
        assert_eq!(state("on", "notDetermined").problem(), None);
        assert_eq!(state("on", "unknown").problem(), None);
        assert_eq!(
            state("on", "denied").problem(),
            Some(BackendError::NotSupported(ACCESS_DENIED.into()))
        );
        assert_eq!(
            state("off", "allowed").problem(),
            Some(BackendError::NotSupported(BLUETOOTH_OFF.into()))
        );
        assert_eq!(
            state("unavailable", "allowed").problem(),
            Some(BackendError::NotSupported(NO_BLUETOOTH.into()))
        );
    }

    #[test]
    fn reads_the_state_and_version() {
        let state =
            parse_state(r#"{"power":"on","access":"allowed","os":"Version 15.1 (Build 24B83)"}"#);
        assert_eq!(state.power, "on");
        assert_eq!(state.version(), Some("15.1"));
        let broken = parse_state("{");
        assert_eq!(broken.power, "unknown");
        assert_eq!(broken.version(), None);
    }

    #[test]
    fn error_messages() {
        assert!(error_message(0xE000_02D6_u32 as i32).starts_with("The buds didn't answer"));
        assert!(error_message(0x04).starts_with("The buds didn't answer"));
        assert!(error_message(0xE000_02D5_u32 as i32).contains("busy"));
        assert_eq!(
            error_message(0xE000_0123_u32 as i32),
            "macOS Bluetooth error 0xe0000123"
        );
    }

    #[test]
    fn diagnostics_report() {
        let state = BluetoothState {
            power: "on".into(),
            access: "allowed".into(),
            os: "Version 15.1 (Build 24B83)".into(),
        };
        let mut buds = device("TWS", HEADPHONES, &[service::AUDIO_SINK]);
        buds.connected = true;
        let paired = [buds, device("Pixel 7", SMARTPHONE, &[])];
        assert_eq!(
            diagnostics(&state, Some(&paired), Some(true)),
            "macOS: Version 15.1 (Build 24B83)\n\
             Bluetooth: power on · access allowed\n\
             AirPlay Receiver: on\n\
             Paired devices (2):\n  \
             TWS · audio · class 0x240418 · services 110b · connected\n  \
             Pixel 7 · phone · class 0x5a020c · services none cached · not connected"
        );
        assert_eq!(
            diagnostics(&BluetoothState::default(), None, None),
            "macOS: unknown\nBluetooth: power  · access \nAirPlay Receiver: not set (macOS default)\n\
             Paired devices: could not be read"
        );
    }
}
