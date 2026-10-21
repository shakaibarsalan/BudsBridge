//! Commands invoked by the web UI.

use budsbridge_core::{Command, DeviceId, DeviceView, Settings, SourceView, UnavailableSource};
use tauri::{AppHandle, State};

use crate::state::{AppInfo, AppState};
use crate::{diagnostics, system};

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

/// Paired phones Windows won't stream audio from, with the reason.
#[tauri::command]
pub async fn list_unavailable_phones(
    state: State<'_, AppState>,
) -> Result<Vec<UnavailableSource>, String> {
    let sources = state.sources();
    tauri::async_runtime::spawn_blocking(move || sources.unavailable())
        .await
        .map_err(|err| err.to_string())
}

/// What BudsBridge shows and Windows reports, as text for a bug report.
#[tauri::command]
pub async fn diagnostics(app: AppHandle, state: State<'_, AppState>) -> Result<String, String> {
    let sources = state.sources();
    let system = tauri::async_runtime::spawn_blocking(move || sources.diagnostics())
        .await
        .map_err(|err| err.to_string())?;
    let version = app.package_info().version.to_string();
    let header = diagnostics::Header {
        version: &version,
        backend: state.runtime().backend_name(),
        windows_build: crate::windows_build(),
    };
    Ok(diagnostics::render(
        &header,
        &state.runtime().views(),
        &state.bridge().views(),
        &state.info(version.clone()).warnings,
        &system,
    ))
}

/// Opens the full window (settings) and closes the dock.
#[tauri::command]
pub fn open_settings(app: AppHandle) {
    crate::show_main_window(&app);
}

#[tauri::command]
pub fn quit_app(app: AppHandle, state: State<'_, AppState>) {
    state.set_quitting();
    app.exit(0);
}

/// The dock page reports its content height so the window fits it.
#[tauri::command]
pub fn dock_resize(app: AppHandle, height: f64) -> Result<(), String> {
    crate::dock::resize(&app, height).map_err(|err| err.to_string())
}

#[tauri::command]
pub fn hide_dock(app: AppHandle) {
    crate::dock::hide(&app);
}
