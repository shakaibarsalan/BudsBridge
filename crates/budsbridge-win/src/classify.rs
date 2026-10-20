//! Platform-independent helpers for turning Core Audio endpoint data into
//! BudsBridge devices. Kept separate from the COM code so it is tested on
//! every OS.

use budsbridge_core::{AudioDevice, AudioProfile, DeviceId};

/// Bluetooth profile served by a kernel-streaming filter, judged by its
/// device id, e.g. `{2}.\\?\bthenum#{0000110b-0000-1000-8000-00805f9b34fb}_...`.
///
/// Returns `None` for filters that do not belong to a Bluetooth device.
pub fn bluetooth_profile(filter_id: &str) -> Option<AudioProfile> {
    let lower = filter_id.to_ascii_lowercase();
    let (_, path) = lower.split_once(r"\\?\")?;
    if path.starts_with("bthhfenum") {
        Some(AudioProfile::HandsFree)
    } else if path.starts_with("bthenum") {
        Some(AudioProfile::Stereo)
    } else if path.starts_with("bthle") {
        Some(AudioProfile::LeAudio)
    } else if path.starts_with("bth") {
        Some(AudioProfile::Unknown)
    } else {
        None
    }
}

/// One Bluetooth render endpoint, as read from Core Audio.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct EndpointInfo {
    /// Device container GUID shared by all endpoints of one physical device.
    pub container_id: String,
    pub name: String,
    pub active: bool,
    /// KS filter that accepts `KSPROPSETID_BtAudio` requests.
    pub filter_id: String,
    pub profile: AudioProfile,
}

/// A physical device and the KS filters that control it.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct DeviceGroup {
    pub device: AudioDevice,
    pub filter_ids: Vec<String>,
}

/// Groups endpoints by container, so "Headphones" (A2DP) and "Headset"
/// (HFP) of the same buds become one device.
pub fn group_endpoints(endpoints: impl IntoIterator<Item = EndpointInfo>) -> Vec<DeviceGroup> {
    let mut groups: Vec<DeviceGroup> = Vec::new();
    for endpoint in endpoints {
        let index = match groups
            .iter()
            .position(|group| group.device.id.as_str() == endpoint.container_id)
        {
            Some(index) => index,
            None => {
                groups.push(DeviceGroup {
                    device: AudioDevice {
                        id: DeviceId::new(endpoint.container_id.clone()),
                        name: String::new(),
                        profiles: Vec::new(),
                        connected: false,
                    },
                    filter_ids: Vec::new(),
                });
                groups.len() - 1
            }
        };
        let group = &mut groups[index];
        if group.device.name.is_empty() {
            group.device.name = endpoint.name;
        }
        group.device.connected |= endpoint.active;
        if !group.device.profiles.contains(&endpoint.profile) {
            group.device.profiles.push(endpoint.profile);
            group.device.profiles.sort();
        }
        if !group.filter_ids.contains(&endpoint.filter_id) {
            group.filter_ids.push(endpoint.filter_id);
        }
    }
    for group in &mut groups {
        if group.device.name.is_empty() {
            group.device.name = "Bluetooth audio device".to_owned();
        }
    }
    groups
}

#[cfg(test)]
mod tests {
    use super::*;

    const A2DP: &str = r"{2}.\\?\bthenum#{0000110b-0000-1000-8000-00805f9b34fb}_vid&0002054c_pid&0d58#8&2a5c3e1&0&a0c9a0123456_c00000000#{6994ad04-93ef-11d0-a3cc-00a0c9223196}\sbc";
    const HFP: &str = r"{2}.\\?\BTHHFENUM#BthHFPAudio#8&1b2c3d4&0&97#{6994ad04-93ef-11d0-a3cc-00a0c9223196}\BthHfpAudio";

    fn endpoint(container: &str, name: &str, active: bool, filter: &str) -> EndpointInfo {
        EndpointInfo {
            container_id: container.into(),
            name: name.into(),
            active,
            filter_id: filter.into(),
            profile: bluetooth_profile(filter).unwrap(),
        }
    }

    #[test]
    fn classifies_bluetooth_filters() {
        assert_eq!(bluetooth_profile(A2DP), Some(AudioProfile::Stereo));
        assert_eq!(bluetooth_profile(HFP), Some(AudioProfile::HandsFree));
        assert_eq!(
            bluetooth_profile(r"{2}.\\?\bthledevice#abc"),
            Some(AudioProfile::LeAudio)
        );
        assert_eq!(
            bluetooth_profile(r"{2}.\\?\bthfoo#abc"),
            Some(AudioProfile::Unknown)
        );
    }

    #[test]
    fn ignores_non_bluetooth_filters() {
        assert_eq!(
            bluetooth_profile(r"{2}.\\?\hdaudio#func_01&ven_10ec&dev_0257"),
            None
        );
        assert_eq!(bluetooth_profile(r"{2}.\\?\usb#vid_046d&pid_0a87"), None);
        assert_eq!(bluetooth_profile("bthenum-without-path-prefix"), None);
        assert_eq!(bluetooth_profile(""), None);
    }

    #[test]
    fn groups_endpoints_of_the_same_container() {
        let groups = group_endpoints([
            endpoint("{B}", "Buds", false, A2DP),
            endpoint("{B}", "Buds", true, HFP),
            endpoint("{S}", "Speaker", false, A2DP),
        ]);
        assert_eq!(groups.len(), 2);

        let buds = &groups[0];
        assert_eq!(buds.device.id.as_str(), "{B}");
        assert_eq!(buds.device.name, "Buds");
        assert!(buds.device.connected, "any active endpoint means connected");
        assert_eq!(
            buds.device.profiles,
            vec![AudioProfile::Stereo, AudioProfile::HandsFree]
        );
        assert_eq!(buds.filter_ids, vec![A2DP.to_owned(), HFP.to_owned()]);

        assert!(!groups[1].device.connected);
    }

    #[test]
    fn duplicate_filters_are_listed_once_and_names_fall_back() {
        let groups = group_endpoints([
            endpoint("{B}", "", false, A2DP),
            endpoint("{B}", "", false, A2DP),
        ]);
        assert_eq!(groups[0].filter_ids.len(), 1);
        assert_eq!(groups[0].device.name, "Bluetooth audio device");
    }
}
