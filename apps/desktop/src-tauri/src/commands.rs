//! Commands invoked by the web UI.

use budsbridge_core::{Command, DeviceId, DeviceView, Settings, SourceView};
use tauri::{AppHandle, State};

use crate::state::{AppInfo, AppState};
use crate::system;

#[tauri::command]
pub fn app_info(app: AppHandle, state: State<'_, AppState>) -> AppInfo {
    state.info(app.package_info().version.to_string())
}

#[tauri::command]
pub fn list_devices(state: State<'_, AppState>) -> Vec<DeviceView> {
    state.runtime().views()
}

/// Requests are asynchronous: progress arrives through `devices-changed`.
#[tauri::command]
pub fn connect_device(state: State<'_, AppState>, id: String) {
    state.runtime().send(Command::Connect(DeviceId::new(id)));
}

#[tauri::command]
pub fn disconnect_device(state: State<'_, AppState>, id: String) {
    state.runtime().send(Command::Disconnect(DeviceId::new(id)));
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Settings {
    state.settings()
}

#[tauri::command]
pub fn update_settings(app: AppHandle, settings: Settings) -> Result<AppInfo, String> {
    system::update_settings(&app, settings)
}

#[tauri::command]
pub fn list_sources(state: State<'_, AppState>) -> Vec<SourceView> {
    state.bridge().views()
}

/// Turns bridge mode on or off for one phone; progress arrives through
/// `sources-changed`.
#[tauri::command]
pub fn set_source_enabled(app: AppHandle, id: String, enabled: bool) -> Result<(), String> {
    system::set_phone_bridged(&app, DeviceId::new(id), enabled)
}
