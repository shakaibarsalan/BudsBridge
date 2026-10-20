//! Applies settings that live outside BudsBridge: hotkey and autostart.

use budsbridge_core::Settings;
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_autostart::ManagerExt;

use crate::state::{AppInfo, AppState};
use crate::{hotkey, tray};

pub const SETTINGS_CHANGED: &str = "settings-changed";

/// Registers the hotkey and syncs "Start with Windows"; returns warnings.
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
    let enabled = launcher.is_enabled().unwrap_or(!wanted);
    let result = match (wanted, enabled) {
        (true, false) => launcher.enable(),
        (false, true) => launcher.disable(),
        _ => Ok(()),
    };
    result.map_err(|err| format!("Could not update Start with Windows: {err}"))
}

/// Saves new settings from the UI or tray and applies them everywhere.
pub fn update_settings(app: &AppHandle, settings: Settings) -> Result<AppInfo, String> {
    let settings = settings.sanitized();
    let state = app.state::<AppState>();
    state.store_settings(settings.clone())?;
    state.set_warnings(apply(app, &settings));
    tray::update(app, &state.runtime().views());
    let _ = app.emit(SETTINGS_CHANGED, &settings);
    Ok(state.info(app.package_info().version.to_string()))
}
