// Stands in for `lib/api` on the video stage (see vite.video.config.ts): the
// real dock reads from this store, and the scenario changes it over time.

import type { UnlistenFn } from "@tauri-apps/api/event";

import type {
  AppInfo,
  DeviceView,
  Settings,
  SourceView,
  UnavailablePhone,
} from "../lib/types";

type Listener<T> = (items: T) => void;

const settings: Settings = {
  version: 1,
  autoReconnect: true,
  reconnect: { initialDelayMs: 2000, maxDelayMs: 30000, maxAttempts: 8 },
  connectTimeoutMs: 15000,
  preferredDevice: null,
  toggleHotkey: "Ctrl+Alt+B",
  startWithWindows: true,
  bridgedPhones: [],
};

const info: AppInfo = { backend: "demo", version: "", mica: true, warnings: [] };

let devices: DeviceView[] = [];
let phones: SourceView[] = [];
const deviceListeners = new Set<Listener<DeviceView[]>>();
const phoneListeners = new Set<Listener<SourceView[]>>();

function subscribe<T>(listeners: Set<Listener<T>>, handler: Listener<T>): Promise<UnlistenFn> {
  listeners.add(handler);
  return Promise.resolve(() => listeners.delete(handler));
}

/** What the scenario uses to change what the dock shows. */
export const stageStore = {
  setDevices(next: DeviceView[]) {
    devices = next;
    for (const listener of deviceListeners) listener(devices);
  },
  setPhones(next: SourceView[]) {
    phones = next;
    for (const listener of phoneListeners) listener(phones);
  },
  devices: () => devices,
  phones: () => phones,
};

const done = () => Promise.resolve();

export const api = {
  appInfo: () => Promise.resolve(info),
  listDevices: () => Promise.resolve(devices),
  connect: (_id: string) => done(),
  disconnect: (_id: string) => done(),
  getSettings: () => Promise.resolve(settings),
  updateSettings: (_next: Settings) => Promise.resolve(info),
  onDevicesChanged: (handler: Listener<DeviceView[]>) => subscribe(deviceListeners, handler),
  listSources: () => Promise.resolve(phones),
  setSourceEnabled: (_id: string, _enabled: boolean) => done(),
  onSourcesChanged: (handler: Listener<SourceView[]>) => subscribe(phoneListeners, handler),
  listUnavailablePhones: () => Promise.resolve<UnavailablePhone[]>([]),
  diagnostics: () => Promise.resolve(""),
  openSettings: () => done(),
  quitApp: () => done(),
  dockResize: (_height: number) => done(),
  hideDock: () => done(),
  onSettingsChanged: (_handler: Listener<Settings>): Promise<UnlistenFn> =>
    Promise.resolve(() => {}),
};
