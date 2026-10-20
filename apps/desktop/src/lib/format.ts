import type { AudioProfile, BridgeState, ConnectionState, DeviceView } from "./types";

const STATE_LABELS: Record<ConnectionState, string> = {
  connected: "Connected",
  connecting: "Connecting…",
  disconnected: "Not connected",
  disconnecting: "Disconnecting…",
};

const PROFILE_LABELS: Record<AudioProfile, string> = {
  stereo: "Stereo",
  handsFree: "Hands-free",
  leAudio: "LE Audio",
  unknown: "Other",
};

export function statusLabel(device: DeviceView): string {
  if (device.reconnectAttempt !== null) {
    return device.state === "connecting"
      ? `Reconnecting (attempt ${device.reconnectAttempt})…`
      : `Reconnect attempt ${device.reconnectAttempt} scheduled`;
  }
  return STATE_LABELS[device.state];
}

export function profileLabel(profile: AudioProfile): string {
  return PROFILE_LABELS[profile];
}

/** True when the primary action should disconnect rather than connect. */
export function isEngaged(state: ConnectionState): boolean {
  return state === "connected" || state === "connecting";
}

const BRIDGE_LABELS: Record<BridgeState, string> = {
  off: "Off",
  connecting: "Connecting to the phone…",
  streaming: "Playing phone audio",
  waiting: "Waiting for the phone (retrying)",
};

export function bridgeStatusLabel(state: BridgeState): string {
  return BRIDGE_LABELS[state];
}

/** Shortens a device name to fit a fixed-width label. */
export function shortName(name: string, max = 13): string {
  return name.length <= max ? name : `${name.slice(0, max - 1).trimEnd()}…`;
}
