import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { AppInfo, DeviceView, Settings, SourceView } from "./types";

export const DEVICES_CHANGED = "devices-changed";
export const SETTINGS_CHANGED = "settings-changed";
export const SOURCES_CHANGED = "sources-changed";

export const api = {
  appInfo: () => invoke<AppInfo>("app_info"),
  listDevices: () => invoke<DeviceView[]>("list_devices"),
  connect: (id: string) => invoke<void>("connect_device", { id }),
  disconnect: (id: string) => invoke<void>("disconnect_device", { id }),
  getSettings: () => invoke<Settings>("get_settings"),
  /** Saves settings and returns the updated app info (with any warnings). */
  updateSettings: (settings: Settings) => invoke<AppInfo>("update_settings", { settings }),
  onDevicesChanged: (handler: (devices: DeviceView[]) => void): Promise<UnlistenFn> =>
    listen<DeviceView[]>(DEVICES_CHANGED, (event) => handler(event.payload)),
  listSources: () => invoke<SourceView[]>("list_sources"),
  /** Turns bridge mode on or off for a phone. */
  setSourceEnabled: (id: string, enabled: boolean) =>
    invoke<void>("set_source_enabled", { id, enabled }),
  onSourcesChanged: (handler: (sources: SourceView[]) => void): Promise<UnlistenFn> =>
    listen<SourceView[]>(SOURCES_CHANGED, (event) => handler(event.payload)),
  /** Fires when settings change elsewhere, e.g. from the tray menu. */
  onSettingsChanged: (handler: (settings: Settings) => void): Promise<UnlistenFn> =>
    listen<Settings>(SETTINGS_CHANGED, (event) => handler(event.payload)),
};
