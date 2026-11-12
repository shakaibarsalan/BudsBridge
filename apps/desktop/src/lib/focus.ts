import { isEngaged } from "./format";
import { type Platform, detectPlatform, words } from "./platform";
import type { DeviceView, SourceView } from "./types";

/**
 * The buds the dock's main controls act on: the hotkey target, else the
 * connected one, else the one connected most recently, else the first.
 * Mirrors `Controller::hotkey_target`.
 */
export function focusDevice(devices: DeviceView[], preferred: string | null): DeviceView | null {
  return (
    devices.find((device) => device.id === preferred) ??
    devices.find((device) => isEngaged(device.state)) ??
    devices.find((device) => device.lastConnected) ??
    devices[0] ??
    null
  );
}

/** The phone the dock shows: one that is switched on, else the first. */
export function focusPhone(phones: SourceView[]): SourceView | null {
  return phones.find((phone) => phone.enabled) ?? phones[0] ?? null;
}

/** Sound sources reaching the buds: the computer, plus every phone playing through it. */
export function soundSources(device: DeviceView | null, phones: SourceView[]): number {
  if (device?.state !== "connected") return 0;
  return 1 + phones.filter((phone) => phone.state === "streaming").length;
}

/** What the sources are, shown next to the count. */
export function sourcesLabel(sources: number, platform: Platform = detectPlatform()): string {
  const computer = words(platform).computer;
  if (sources <= 0) return "buds not here";
  if (sources === 1) return computer;
  if (sources === 2) return `phone + ${computer}`;
  return `${sources - 1} phones + ${computer}`;
}

export interface Headline {
  title: string;
  detail: string;
}

export function headline(
  device: DeviceView | null,
  phones: SourceView[],
  platform: Platform = detectPlatform(),
): Headline {
  const { computer, pairIn } = words(platform);
  if (!device) {
    return {
      title: "No buds paired",
      detail: `Pair them in ${pairIn}`,
    };
  }
  switch (device.state) {
    case "connecting":
      return { title: `Connecting ${device.name}…`, detail: `Bringing the buds to this ${computer}` };
    case "disconnecting":
      return { title: `Releasing ${device.name}…`, detail: "Handing the buds back" };
    case "disconnected":
      return {
        title: `Buds not on this ${computer}`,
        detail:
          device.reconnectAttempt !== null
            ? `Reconnecting ${device.name} (attempt ${device.reconnectAttempt})`
            : `${device.name} is free for your phone`,
      };
    case "connected":
      break;
  }
  const playing = phones.filter((item) => item.state === "streaming");
  if (playing.length > 0) {
    return {
      title:
        playing.length === 1
          ? `Hearing phone + ${computer}`
          : `Hearing ${playing.length} phones + ${computer}`,
      detail: `${device.name} on this ${computer} · ${playing.map((item) => item.name).join(" + ")} playing through it`,
    };
  }
  const phone = focusPhone(phones);
  const title = `Buds on this ${computer}`;
  if (phone && (phone.state === "connecting" || phone.state === "waiting")) {
    return { title, detail: `${device.name} connected · waiting for ${phone.name}` };
  }
  // A Mac has no Bluetooth phone audio to switch off.
  if (platform === "macos") return { title, detail: `${device.name} connected` };
  return { title, detail: `${device.name} connected · phone audio off` };
}
