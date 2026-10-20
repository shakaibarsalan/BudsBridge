import { useCallback, useEffect, useState } from "react";

import { api } from "./api";
import { isEngaged } from "./format";
import type { AppInfo, DeviceView, Settings, SourceView } from "./types";
import { useLiveList } from "./useLiveList";

/** Everything both windows show, kept in sync with the Rust runtimes, plus the actions on it. */
export function useBudsBridge() {
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

  const report = useCallback((err: unknown) => setActionError(String(err)), []);

  const saveSettings = useCallback(
    async (next: Settings) => {
      setActionError(null);
      try {
        setInfo(await api.updateSettings(next));
        setSettings(next);
      } catch (err) {
        report(err);
      }
    },
    [report],
  );

  const toggleDevice = useCallback(
    (device: DeviceView) => {
      setActionError(null);
      const request = isEngaged(device.state) ? api.disconnect(device.id) : api.connect(device.id);
      request.catch(report);
    },
    [report],
  );

  const togglePhone = useCallback(
    (phone: SourceView, enabled: boolean) => {
      setActionError(null);
      api.setSourceEnabled(phone.id, enabled).catch(report);
    },
    [report],
  );

  const makeHotkeyTarget = useCallback(
    (id: string) => {
      if (settings) void saveSettings({ ...settings, preferredDevice: id });
    },
    [settings, saveSettings],
  );

  return {
    devices,
    phones,
    settings,
    info,
    error: actionError ?? loadError,
    saveSettings,
    toggleDevice,
    togglePhone,
    makeHotkeyTarget,
  };
}
