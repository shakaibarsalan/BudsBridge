import { useCallback, useEffect, useState } from "react";

import { DeviceCard } from "./components/DeviceCard";
import { PhoneAudioPanel } from "./components/PhoneAudioPanel";
import { SettingsPanel } from "./components/SettingsPanel";
import { api } from "./lib/api";
import { isEngaged } from "./lib/format";
import type { AppInfo, DeviceView, Settings, SourceView } from "./lib/types";
import { useLiveList } from "./lib/useLiveList";

// Functional MVP layout. The final look follows the reference design.
export function App() {
  const { items: devices, error: loadError } = useLiveList(api.listDevices, api.onDevicesChanged);
  const { items: phones } = useLiveList(api.listSources, api.onSourcesChanged);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    api.appInfo().then(setInfo).catch((err: unknown) => setActionError(String(err)));
    api.getSettings().then(setSettings).catch((err: unknown) => setActionError(String(err)));
    const unlisten = api.onSettingsChanged(setSettings);
    return () => void unlisten.then((stop) => stop());
  }, []);

  useEffect(() => {
    document.documentElement.dataset.backdrop = info?.mica ? "mica" : "solid";
  }, [info?.mica]);

  const saveSettings = useCallback(async (next: Settings) => {
    setActionError(null);
    try {
      setInfo(await api.updateSettings(next));
      setSettings(next);
    } catch (err) {
      setActionError(String(err));
    }
  }, []);

  const toggle = useCallback((device: DeviceView) => {
    setActionError(null);
    const request = isEngaged(device.state) ? api.disconnect(device.id) : api.connect(device.id);
    request.catch((err: unknown) => setActionError(String(err)));
  }, []);

  const togglePhone = useCallback((phone: SourceView, enabled: boolean) => {
    setActionError(null);
    api.setSourceEnabled(phone.id, enabled).catch((err: unknown) => setActionError(String(err)));
  }, []);

  const makeHotkeyTarget = useCallback(
    (id: string) => {
      if (settings) void saveSettings({ ...settings, preferredDevice: id });
    },
    [settings, saveSettings],
  );

  const error = actionError ?? loadError;

  return (
    <div className="app">
      <header className="app__header">
        <h1>BudsBridge</h1>
        {info?.backend === "demo" && <span className="badge">Demo mode: simulated devices</span>}
      </header>

      <main className="app__main">
        <section className="panel" aria-labelledby="devices-title">
          <h2 id="devices-title">Bluetooth audio</h2>
          {error && (
            <p className="banner banner--error" role="alert">
              {error}
            </p>
          )}
          {devices === null ? (
            <p className="muted">Looking for paired devices…</p>
          ) : devices.length === 0 ? (
            <p className="muted">
              No paired Bluetooth audio devices. Pair your buds in Windows Settings → Bluetooth &amp;
              devices, then they show up here.
            </p>
          ) : (
            <ul className="devices">
              {devices.map((device) => (
                <DeviceCard
                  key={device.id}
                  device={device}
                  isHotkeyTarget={settings?.preferredDevice === device.id}
                  onToggle={toggle}
                  onMakeHotkeyTarget={makeHotkeyTarget}
                />
              ))}
            </ul>
          )}
        </section>

        <PhoneAudioPanel phones={phones} onToggle={togglePhone} />

        {settings && (
          <SettingsPanel
            settings={settings}
            warnings={info?.warnings ?? []}
            onChange={(next) => void saveSettings(next)}
          />
        )}
      </main>

      <footer className="app__footer muted">v{info?.version ?? "…"}</footer>
    </div>
  );
}
