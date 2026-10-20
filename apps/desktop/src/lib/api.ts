import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

import type { AppInfo, DeviceView, Settings } from "./types";

export const DEVICES_CHANGED = "devices-changed";

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
};
