import {
  AlertTriangle,
  ChevronRight,
  Headphones,
  Keyboard,
  Power,
  RefreshCw,
  Settings as SettingsIcon,
  Smartphone,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { api } from "../../lib/api";
import { focusDevice, focusPhone, headline, soundSources } from "../../lib/focus";
import { bridgeStatusLabel, isEngaged, statusLabel } from "../../lib/format";
import type { DeviceView, SourceView } from "../../lib/types";
import { useBudsBridge } from "../../lib/useBudsBridge";
import { ExpandRow } from "./ExpandRow";
import { FlowHero } from "./FlowHero";
import { MoreMenu } from "./MoreMenu";
import { Tile } from "./Tile";

const DEVICE_TILE: Record<DeviceView["state"], string> = {
  connected: "Connected",
  connecting: "Connecting…",
  disconnecting: "Releasing…",
  disconnected: "Not connected",
};

const PHONE_TILE: Record<SourceView["state"], string> = {
  off: "Off",
  connecting: "Connecting…",
  waiting: "Waiting…",
  streaming: "Playing",
};

/** Keeps the dock window exactly as tall as its content. */
function useFitWindow(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    let last = 0;
    const observer = new ResizeObserver(() => {
      const height = Math.ceil(element.getBoundingClientRect().height);
      if (height !== last) {
        last = height;
        api.dockResize(height).catch((err: unknown) => console.warn("dock resize failed", err));
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
}

/** The panel that opens from the tray icon: everyday control without the full window. */
export function Dock() {
  const {
    devices,
    phones,
    settings,
    info,
    error,
    saveSettings,
    toggleDevice,
    togglePhone,
  } = useBudsBridge();
  const [open, setOpen] = useState<"devices" | "phones" | null>(null);
  const root = useRef<HTMLDivElement>(null);
  useFitWindow(root);

  const deviceList = devices ?? [];
  const phoneList = phones ?? [];
  const device = focusDevice(deviceList, settings?.preferredDevice ?? null);
  const phone = focusPhone(phoneList);
  const sources = soundSources(device, phoneList);
  const { title, detail } = headline(device, phone);
  const problem = error ?? device?.lastError ?? phone?.lastError ?? null;
  const demo = info?.backend === "demo";

  const subtitle = [
    demo ? "Demo" : null,
    device?.state === "connected" ? `${device.name} connected` : "No buds connected",
    phone?.state === "streaming" ? `${phone.name} audio on` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const toggleSection = (section: "devices" | "phones") =>
    setOpen((current) => (current === section ? null : section));

  return (
    <div className="dock" ref={root}>
      <header className="dock__header">
        <div className="dock__titles">
          <h1 className="dock__title">BudsBridge</h1>
          <p className="dock__subtitle">{subtitle}</p>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label="Open settings"
          onClick={() => void api.openSettings()}
        >
          <SettingsIcon size={15} />
        </button>
        <MoreMenu
          startWithWindows={settings?.startWithWindows ?? false}
          onStartWithWindows={(enabled) => {
            if (settings) void saveSettings({ ...settings, startWithWindows: enabled });
          }}
          onSettings={() => void api.openSettings()}
          onQuit={() => void api.quitApp()}
        />
      </header>

      {problem && (
        <p className="banner" role="alert">
          <AlertTriangle size={13} aria-hidden="true" />
          {problem}
        </p>
      )}

      <section className="dock-card" aria-label="Status">
        <div className="dock-card__head">
          <div>
            <h2 className="dock-card__title">{title}</h2>
            <p className="dock-card__detail">{detail}</p>
          </div>
          {device && (
            <button
              type="button"
              className={`power ${device.state === "connected" ? "power--on" : ""} ${
                device.state === "connecting" || device.state === "disconnecting" ? "power--busy" : ""
              }`}
              aria-label={`${isEngaged(device.state) ? "Disconnect" : "Connect"} ${device.name}`}
              onClick={() => toggleDevice(device)}
            >
              <Power size={18} />
            </button>
          )}
        </div>

        <FlowHero device={device} phone={phone} />

        <div className="count">
          <span className="count__number">{sources}</span>
          <span className="count__unit">{sources === 1 ? "source" : "sources"}</span>
          <span className="count__label">in your buds</span>
          <span className="count__side">
            {sources === 2 ? "phone + laptop" : sources === 1 ? "laptop" : "buds not here"}
          </span>
        </div>

        <div className="tiles">
          <Tile
            icon={<Headphones size={15} />}
            caption="Buds"
            value={device ? DEVICE_TILE[device.state] : "None"}
            detail={device?.name ?? "Pair in Windows"}
            tone={
              device?.state === "connected"
                ? "buds"
                : device && isEngaged(device.state)
                  ? "busy"
                  : "off"
            }
            label={device ? `Buds: ${statusLabel(device)}` : "No buds paired"}
            onClick={device ? () => toggleDevice(device) : undefined}
          />
          <Tile
            icon={<Smartphone size={15} />}
            caption="Phone audio"
            value={phone ? PHONE_TILE[phone.state] : "None"}
            detail={phone?.name ?? "Pair in Windows"}
            tone={
              phone?.state === "streaming"
                ? "phone"
                : phone?.state === "connecting" || phone?.state === "waiting"
                  ? "busy"
                  : "off"
            }
            label={phone ? `Phone audio: ${bridgeStatusLabel(phone.state)}` : "No phone paired"}
            onClick={phone ? () => togglePhone(phone, !phone.enabled) : undefined}
          />
          <Tile
            icon={<Keyboard size={15} />}
            caption="Hotkey"
            value={settings?.toggleHotkey ?? "Off"}
            detail="toggles buds"
            label={`Hotkey: ${settings?.toggleHotkey ?? "off"}. Change it in settings`}
            onClick={() => void api.openSettings()}
          />
          <Tile
            icon={<RefreshCw size={15} />}
            caption="Reconnect"
            value={settings?.autoReconnect ? "On" : "Off"}
            detail="after drops"
            tone={settings?.autoReconnect ? "buds" : "off"}
            label={`Auto-reconnect ${settings?.autoReconnect ? "on" : "off"}`}
            onClick={
              settings
                ? () => void saveSettings({ ...settings, autoReconnect: !settings.autoReconnect })
                : undefined
            }
          />
        </div>

        <ExpandRow
          title="Devices"
          value={`${deviceList.length} paired`}
          open={open === "devices"}
          onToggle={() => toggleSection("devices")}
        >
          {deviceList.length === 0 ? (
            <p className="dock-empty">Pair your buds in Windows Settings → Bluetooth &amp; devices.</p>
          ) : (
            <ul className="rows">
              {deviceList.map((item) => (
                <li key={item.id} className={`row row--${item.state}`} aria-label={item.name}>
                  <span className="row__dot" aria-hidden="true" />
                  <span className="row__text">
                    <span className="row__name">{item.name}</span>
                    <span className="row__state">{statusLabel(item)}</span>
                  </span>
                  <button
                    type="button"
                    className="pill"
                    aria-label={`${isEngaged(item.state) ? "Disconnect" : "Connect"} ${item.name}`}
                    onClick={() => toggleDevice(item)}
                  >
                    {isEngaged(item.state) ? "Disconnect" : "Connect"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ExpandRow>

        <ExpandRow
          title="Phones"
          value={`${phoneList.length} paired`}
          open={open === "phones"}
          onToggle={() => toggleSection("phones")}
        >
          {phoneList.length === 0 ? (
            <p className="dock-empty">
              Pair your phone with this laptop in Windows Settings → Bluetooth &amp; devices.
            </p>
          ) : (
            <ul className="rows">
              {phoneList.map((item) => (
                <li
                  key={item.id}
                  className={`row row--${item.state === "streaming" ? "connected" : item.state === "off" ? "disconnected" : "connecting"}`}
                  aria-label={item.name}
                >
                  <span className="row__dot" aria-hidden="true" />
                  <span className="row__text">
                    <span className="row__name">{item.name}</span>
                    <span className="row__state">{bridgeStatusLabel(item.state)}</span>
                  </span>
                  <input
                    type="checkbox"
                    role="switch"
                    className="toggle"
                    aria-label={`Hear ${item.name} in my buds`}
                    checked={item.enabled}
                    onChange={(event) => togglePhone(item, event.target.checked)}
                  />
                </li>
              ))}
            </ul>
          )}
        </ExpandRow>
      </section>

      <button type="button" className="dock__footer" onClick={() => void api.openSettings()}>
        All settings
        <ChevronRight size={14} aria-hidden="true" />
      </button>
    </div>
  );
}
