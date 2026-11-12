//! Applies settings that live outside BudsBridge: hotkey and autostart.

use budsbridge_core::{DeviceId, Settings};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;

use crate::state::{AppInfo, AppState};
use crate::{hotkey, tray};

pub const SETTINGS_CHANGED: &str = "settings-changed";

/// Registers the hotkey and syncs "Start with Windows" ("Open at login" on
/// macOS); returns warnings.
pub fn apply(app: &AppHandle, settings: &Settings) -> Vec<String> {
    let mut warnings = Vec::new();
    if let Err(warning) = hotkey::register(app, settings.toggle_hotkey.as_deref()) {
        warnings.push(warning);
    }
    if let Err(warning) = sync_autostart(app, settings.start_with_windows) {
        warnings.push(warning);
    }
    for warning in &warnings {
        log::warn!("{warning}");
    }
    warnings
}

fn sync_autostart(app: &AppHandle, wanted: bool) -> Result<(), String> {
    let launcher = app.autolaunch();
    let result = if wanted {
        // Always (re)write it, so it points at this copy of BudsBridge even
        // if an older copy elsewhere registered itself first.
        launcher.enable()
    } else if launcher.is_enabled().unwrap_or(true) {
        launcher.disable()
    } else {
        Ok(())
    };
    result.map_err(|err| format!("Could not update {AUTOSTART_LABEL}: {err}"))
}

#[cfg(target_os = "macos")]
const AUTOSTART_LABEL: &str = "Open at login";
#[cfg(not(target_os = "macos"))]
const AUTOSTART_LABEL: &str = "Start with Windows";

/// The System Settings page for `page`, as a URL macOS opens.
pub fn settings_url(page: &str) -> Option<&'static str> {
    Some(match page {
        "bluetooth" => "x-apple.systempreferences:com.apple.BluetoothSettings",
        "airplay" => "x-apple.systempreferences:com.apple.AirDrop-Handoff-Settings.extension",
        "bluetooth-privacy" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Bluetooth"
        }
        _ => return None,
    })
}

/// Opens a System Settings page: `bluetooth`, `airplay` or
/// `bluetooth-privacy`.
pub fn open_settings_page(page: &str) -> Result<(), String> {
    let url = settings_url(page).ok_or_else(|| format!("unknown settings page \"{page}\""))?;
    if !cfg!(target_os = "macos") {
        return Err("Opening this settings page is only available on macOS.".into());
    }
    // `open` hands the URL to macOS and returns at once.
    match std::process::Command::new("open").arg(url).status() {
        Ok(status) if status.success() => Ok(()),
        Ok(status) => Err(format!("Could not open System Settings ({status}).")),
        Err(err) => Err(format!("Could not open System Settings: {err}")),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn settings_pages() {
        assert_eq!(
            settings_url("airplay"),
            Some("x-apple.systempreferences:com.apple.AirDrop-Handoff-Settings.extension")
        );
        assert!(settings_url("bluetooth").is_some());
        assert!(settings_url("bluetooth-privacy").is_some());
        assert_eq!(settings_url("anything else"), None);
        assert!(open_settings_page("anything else").is_err());
    }
}

/// Saves new settings from the UI or tray and applies them everywhere.
pub fn update_settings(app: &AppHandle, settings: Settings) -> Result<AppInfo, String> {
    let settings = settings.sanitized();
    let state = app.state::<AppState>();
    state.store_settings(settings.clone())?;
    state.set_warnings(apply(app, &settings));
    tray::update(app);
    let _ = app.emit(SETTINGS_CHANGED, &settings);
    Ok(state.info(app.package_info().version.to_string()))
}

/// Turns bridge mode on or off for a phone and remembers it for next start.
pub fn set_phone_bridged(app: &AppHandle, id: DeviceId, enabled: bool) -> Result<(), String> {
    let state = app.state::<AppState>();
    state.bridge().set_enabled(id.clone(), enabled);
    let mut settings = state.settings();
    settings.bridged_phones.retain(|phone| phone != &id);
    if enabled {
        settings.bridged_phones.push(id);
    }
    let settings = settings.sanitized();
    state.store_settings(settings.clone())?;
    let _ = app.emit(SETTINGS_CHANGED, &settings);
    Ok(())
}
