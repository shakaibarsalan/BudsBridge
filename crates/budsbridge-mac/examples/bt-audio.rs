//! Hardware check tool for the macOS backend: the same calls the app makes,
//! without the app.
//!
//! ```text
//! cargo run -p budsbridge-mac --example bt-audio -- list
//! cargo run -p budsbridge-mac --example bt-audio -- connect a1-b2-c3-d4-e5-f6
//! cargo run -p budsbridge-mac --example bt-audio -- disconnect a1-b2-c3-d4-e5-f6
//! cargo run -p budsbridge-mac --example bt-audio -- diagnostics
//! ```
//!
//! Run it from Terminal: macOS asks once whether Terminal may use Bluetooth.

#[cfg(target_os = "macos")]
fn main() {
    use std::thread;
    use std::time::{Duration, Instant};

    use budsbridge_core::{DeviceBackend, DeviceId, SourceBackend};
    use budsbridge_mac::{MacBackend, MacPhoneBackend};

    let backend = MacBackend::new();
    let args: Vec<String> = std::env::args().skip(1).collect();
    let print = |backend: &MacBackend| match backend.list_devices() {
        Ok(devices) if devices.is_empty() => println!("No paired Bluetooth audio devices found."),
        Ok(devices) => {
            for device in devices {
                let state = if device.connected {
                    "connected"
                } else {
                    "disconnected"
                };
                println!(
                    "{:<14} {:<20} {:?}  {}",
                    state, device.id, device.profiles, device.name
                );
            }
        }
        Err(err) => eprintln!("listing failed: {err}"),
    };
    // Connecting runs in the background; wait here until the state flips.
    let wait_for = |backend: &MacBackend, id: &DeviceId, connected: bool| {
        let started = Instant::now();
        while started.elapsed() < Duration::from_secs(15) {
            let done = backend.list_devices().is_ok_and(|devices| {
                devices
                    .iter()
                    .any(|device| &device.id == id && device.connected == connected)
            });
            if done {
                println!("done after {:.1} s", started.elapsed().as_secs_f32());
                return true;
            }
            thread::sleep(Duration::from_millis(250));
        }
        println!("no change after 15 s");
        false
    };

    let code = match (args.first().map(String::as_str), args.get(1)) {
        (Some("list") | None, _) => {
            print(&backend);
            0
        }
        (Some("diagnostics"), _) => {
            println!("{}", MacPhoneBackend::new().diagnostics());
            0
        }
        (Some(command @ ("connect" | "disconnect")), Some(id)) => {
            let id = DeviceId::new(id.as_str());
            let connect = command == "connect";
            let result = if connect {
                backend.connect(&id)
            } else {
                backend.disconnect(&id)
            };
            match result {
                Ok(()) if wait_for(&backend, &id, connect) => 0,
                Ok(()) => 1,
                Err(err) => {
                    eprintln!("{command} failed: {err}");
                    1
                }
            }
        }
        _ => {
            eprintln!(
                "usage: bt-audio [list | diagnostics | connect <address> | disconnect <address>]"
            );
            2
        }
    };
    print(&backend);
    std::process::exit(code);
}

#[cfg(not(target_os = "macos"))]
fn main() {
    eprintln!("This tool talks to macOS Bluetooth and only runs on macOS.");
    std::process::exit(1);
}
