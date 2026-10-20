import { describe, expect, it } from "vitest";

import { isEngaged, profileLabel, statusLabel } from "./format";
import type { DeviceView } from "./types";

const base: DeviceView = {
  id: "buds",
  name: "Buds",
  profiles: ["stereo"],
  state: "disconnected",
  reconnectAttempt: null,
  lastError: null,
};

describe("statusLabel", () => {
  it("describes plain states", () => {
    expect(statusLabel({ ...base, state: "connected" })).toBe("Connected");
    expect(statusLabel({ ...base, state: "connecting" })).toBe("Connecting…");
    expect(statusLabel(base)).toBe("Not connected");
    expect(statusLabel({ ...base, state: "disconnecting" })).toBe("Disconnecting…");
  });

  it("describes auto-reconnect progress", () => {
    expect(statusLabel({ ...base, state: "connecting", reconnectAttempt: 2 })).toBe(
      "Reconnecting (attempt 2)…",
    );
    expect(statusLabel({ ...base, reconnectAttempt: 3 })).toBe("Reconnect attempt 3 scheduled");
  });
});

describe("helpers", () => {
  it("labels profiles", () => {
    expect(profileLabel("handsFree")).toBe("Hands-free");
    expect(profileLabel("leAudio")).toBe("LE Audio");
  });

  it("treats connecting as engaged", () => {
    expect(isEngaged("connected")).toBe(true);
    expect(isEngaged("connecting")).toBe(true);
    expect(isEngaged("disconnecting")).toBe(false);
    expect(isEngaged("disconnected")).toBe(false);
  });
});
