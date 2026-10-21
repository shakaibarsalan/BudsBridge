// Mirrors the serde types in crates/budsbridge-core and src-tauri.

export type ConnectionState = "disconnected" | "connecting" | "connected" | "disconnecting";

export type AudioProfile = "stereo" | "handsFree" | "leAudio" | "unknown";

export interface DeviceView {
  id: string;
  name: string;
  profiles: AudioProfile[];
  state: ConnectionState;
  reconnectAttempt: number | null;
  lastError: string | null;
}

export type BridgeState = "off" | "connecting" | "streaming" | "waiting";

/** A paired phone whose audio can play through the laptop (bridge mode). */
export interface SourceView {
  id: string;
  name: string;
  /** The user wants this phone's audio in the buds. */
  enabled: boolean;
  state: BridgeState;
  lastError: string | null;
}

export type UnavailableReason = "noAudioService" | "lowEnergyOnly";

/** A paired phone that can't stream to this laptop, listed with the reason. */
export interface UnavailablePhone {
  name: string;
  reason: UnavailableReason;
}

export interface ReconnectPolicy {
  initialDelayMs: number;
  maxDelayMs: number;
  maxAttempts: number;
}

export interface Settings {
  version: number;
  autoReconnect: boolean;
  reconnect: ReconnectPolicy;
  connectTimeoutMs: number;
  preferredDevice: string | null;
  toggleHotkey: string | null;
  startWithWindows: boolean;
  bridgedPhones: string[];
}

export interface AppInfo {
  /** "windows" for real devices, "demo" for the simulated backend. */
  backend: string;
  version: string;
  /** Window uses the Windows 11 Mica backdrop, so the page must be transparent. */
  mica: boolean;
  /** Problems applying settings, e.g. a hotkey already taken by another app. */
  warnings: string[];
}
