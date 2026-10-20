import type { AudioProfile, ConnectionState, DeviceView } from "./types";

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
