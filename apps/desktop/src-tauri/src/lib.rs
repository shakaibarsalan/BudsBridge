//! BudsBridge desktop shell: window, tray, hotkey and autostart around the
//! platform-independent runtime in `budsbridge-core`.

mod commands;
mod hotkey;
mod labels;
mod state;
mod system;
mod tray;

use std::sync::Arc;

use budsbridge_core::{DeviceBackend, Runtime};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent};

use crate::state::AppState;

pub const MAIN_WINDOW: &str = "main";
/// Passed by autostart so BudsBridge starts in the tray.
pub const MINIMIZED_ARG: &str = "--minimized";
pub const DEVICES_CHANGED: &str = "devices-changed";
/// Set to `1` to use simulated devices, e.g. for demos and screenshots.
pub const DEMO_ENV: &str = "BUDSBRIDGE_DEMO";

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app)
        }))
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![MINIMIZED_ARG]),
        ))
        .plugin(hotkey::plugin())
        .invoke_handler(tauri::generate_handler![
            commands::app_info,
            commands::list_devices,
            commands::connect_device,
            commands::disconnect_device,
            commands::get_settings,
            commands::update_settings,
        ])
        .setup(|app| {
            setup(app.handle())?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                // Closing the window keeps BudsBridge running in the tray.
                let quitting = window
                    .app_handle()
                    .try_state::<AppState>()
                    .is_some_and(|state| state.is_quitting());
                if window.label() == MAIN_WINDOW && !quitting {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running BudsBridge");
}

fn setup(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let settings_path = app.path().app_config_dir()?.join("settings.json");
    let settings = state::load_settings(&settings_path);
    let backend = create_backend();
    log::info!(
        "BudsBridge {} starting with the {} backend",
        app.package_info().version,
        backend.name()
    );

    let events = app.clone();
    let runtime = Runtime::spawn(
        backend,
        settings.controller_config(),
        Box::new(move |views| {
            if let Err(err) = events.emit(DEVICES_CHANGED, views) {
                log::warn!("could not notify the UI: {err}");
            }
            tray::update(&events, views);
        }),
    );

    let mica = supports_mica();
    app.manage(AppState::new(
        runtime,
        settings.clone(),
        settings_path,
        mica,
    ));
    app.state::<AppState>()
        .set_warnings(system::apply(app, &settings));
    tray::create(app)?;
    create_main_window(app, mica)?;
    Ok(())
}

fn create_backend() -> Arc<dyn DeviceBackend> {
    let demo = std::env::var(DEMO_ENV).is_ok_and(|value| value == "1");
    #[cfg(windows)]
    if !demo {
        return Arc::new(budsbridge_win::WindowsBackend::new());
    }
    if !demo {
        log::warn!("no Bluetooth backend for this platform; using demo devices");
    }
    Arc::new(budsbridge_core::fake::FakeBackend::demo())
}

fn supports_mica() -> bool {
    #[cfg(windows)]
    return budsbridge_win::supports_mica();
    #[cfg(not(windows))]
    false
}

fn create_main_window(app: &AppHandle, mica: bool) -> tauri::Result<()> {
    let minimized = std::env::args().any(|arg| arg == MINIMIZED_ARG);
    let builder = WebviewWindowBuilder::new(app, MAIN_WINDOW, WebviewUrl::default())
        .title("BudsBridge")
        .inner_size(420.0, 640.0)
        .min_inner_size(360.0, 480.0)
        .center()
        .visible(!minimized);
    let builder = if mica {
        use tauri::window::{Effect, EffectsBuilder};
        builder
            .transparent(true)
            .effects(EffectsBuilder::new().effect(Effect::Mica).build())
    } else {
        builder
    };
    builder.build()?;
    Ok(())
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window(MAIN_WINDOW) {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}
