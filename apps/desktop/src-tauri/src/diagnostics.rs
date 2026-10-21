//! The plain-text report behind "Copy diagnostics": what BudsBridge shows and
//! what Windows reports, so a bug report says what the user's machine sees.

use budsbridge_core::{DeviceView, SourceView};

pub struct Header<'a> {
    pub version: &'a str,
    pub backend: &'a str,
    pub windows_build: Option<u32>,
}

pub fn render(
    header: &Header<'_>,
    devices: &[DeviceView],
    phones: &[SourceView],
    warnings: &[String],
    system: &str,
) -> String {
    let mut lines = vec![format!(
        "BudsBridge {} · {} backend · {}",
        header.version,
        header.backend,
        header.windows_build.map_or_else(
            || "not Windows".to_owned(),
            |build| format!("Windows build {build}")
        )
    )];

    lines.push(format!("Buds and headphones ({}):", devices.len()));
    for device in devices {
        let profiles: Vec<String> = device
            .profiles
            .iter()
            .map(|profile| format!("{profile:?}").to_lowercase())
            .collect();
        lines.push(with_error(
            format!(
                "  {} · {} · {}",
                device.name,
                format!("{:?}", device.state).to_lowercase(),
                profiles.join(", ")
            ),
            device.last_error.as_deref(),
        ));
    }

    lines.push(format!("Phones ({}):", phones.len()));
    for phone in phones {
        lines.push(with_error(
            format!(
                "  {} · {} · {}",
                phone.name,
                format!("{:?}", phone.state).to_lowercase(),
                if phone.enabled {
                    "phone audio on"
                } else {
                    "phone audio off"
                }
            ),
            phone.last_error.as_deref(),
        ));
    }

    lines.push(format!(
        "Warnings: {}",
        if warnings.is_empty() {
            "none".to_owned()
        } else {
            warnings.join("; ")
        }
    ));
    lines.push(String::new());
    lines.push(system.trim_end().to_owned());
    lines.join("\n")
}

fn with_error(line: String, error: Option<&str>) -> String {
    match error {
        Some(error) => format!("{line} · last error: {error}"),
        None => line,
    }
}

#[cfg(test)]
mod tests {
    use budsbridge_core::{AudioProfile, BridgeState, ConnectionState, DeviceId};

    use super::*;

    #[test]
    fn report_lists_what_budsbridge_and_windows_see() {
        let devices = [DeviceView {
            id: DeviceId::new("tws"),
            name: "TWS".into(),
            profiles: vec![AudioProfile::Stereo, AudioProfile::HandsFree],
            state: ConnectionState::Connected,
            reconnect_attempt: None,
            last_error: None,
        }];
        let phones = [SourceView {
            id: DeviceId::new("pixel"),
            name: "Pixel 7".into(),
            enabled: true,
            state: BridgeState::Waiting,
            last_error: Some("The phone didn't answer.".into()),
        }];
        let header = Header {
            version: "0.3.2",
            backend: "windows",
            windows_build: Some(26100),
        };

        let report = render(&header, &devices, &phones, &[], "Paired devices (0):\n");

        assert_eq!(
            report,
            "BudsBridge 0.3.2 · windows backend · Windows build 26100\n\
             Buds and headphones (1):\n  TWS · connected · stereo, handsfree\n\
             Phones (1):\n  Pixel 7 · waiting · phone audio on · last error: The phone didn't answer.\n\
             Warnings: none\n\nPaired devices (0):"
        );
    }
}
