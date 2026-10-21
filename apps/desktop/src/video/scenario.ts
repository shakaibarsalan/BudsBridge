// The walkthrough: one step per spoken line (scripts/video/narrate.py), in
// the same order. Device names are the ones on the laptop BudsBridge was
// tested on; their states here are simulated.

import type { ConnectionState, DeviceView, SourceView } from "../lib/types";
import type { Step } from "./director";
import { stageStore } from "./mockApi";

function buds(id: string, name: string, state: ConnectionState, lastConnected = false): DeviceView {
  return {
    id,
    name,
    profiles: ["stereo", "handsFree"],
    state,
    reconnectAttempt: null,
    lastError: null,
    lastConnected,
  };
}

function phone(id: string, name: string, state: SourceView["state"], enabled: boolean): SourceView {
  return { id, name, enabled, state, lastError: null };
}

function setBuds(state: ConnectionState) {
  stageStore.setDevices([
    buds("ignite", "IGNITE", "disconnected"),
    buds("tws", "TWS", state, true),
    buds("wave", "Wave Pro", "disconnected"),
  ]);
}

function setPhones(oppo: SourceView["state"], pixel: SourceView["state"]) {
  stageStore.setPhones([
    phone("oppo", "OPPO A83", oppo, oppo !== "off"),
    phone("pixel", "Pixel 7", pixel, pixel !== "off"),
  ]);
}

export function setUp() {
  setBuds("connected");
  setPhones("off", "off");
}

const tile = (label: string) => `.dock [aria-label^="${label}"]`;
const phonesRow = () =>
  [...document.querySelectorAll(".dock .expand__row")].find((row) =>
    row.textContent?.startsWith("Phones"),
  );
const pixelSwitch = '.dock [aria-label="Hear Pixel 7 in my buds"]';
const clickPhonesRow = () => (phonesRow() as HTMLElement | undefined)?.click();

export const STEPS: Step[] = [
  {
    id: "hook",
    actions: [
      { at: 0.8, kind: "move", to: ".tray-app", dur: 1.8 },
      { at: 2.6, kind: "ring", target: ".tray-app", dur: 1.6 },
    ],
  },
  {
    id: "open",
    actions: [
      { at: 0, kind: "click" },
      { at: 0.05, kind: "dock", open: true },
      { at: 1.0, kind: "move", to: ".dock .hero", dur: 1.0, dx: 0.5, dy: 1.25 },
    ],
  },
  {
    id: "phone",
    actions: [
      { at: 0.1, kind: "move", to: tile("Phone audio"), dur: 0.8, dx: 0.45 },
      { at: 1.0, kind: "click" },
      { at: 1.1, kind: "do", run: () => setPhones("connecting", "off") },
      { at: 2.3, kind: "do", run: () => setPhones("streaming", "off") },
      { at: 2.5, kind: "ring", target: ".dock .hero", dur: 2.4 },
      { at: 2.6, kind: "move", to: ".dock .hero", dur: 1.0, dx: 0.5, dy: 1.25 },
    ],
  },
  {
    id: "second",
    actions: [
      { at: 0.1, kind: "move", to: phonesRow, dur: 0.8, dx: 0.15 },
      { at: 0.95, kind: "click" },
      { at: 1.0, kind: "do", run: clickPhonesRow },
      { at: 1.25, kind: "move", to: pixelSwitch, dur: 0.7 },
      { at: 2.0, kind: "click" },
      { at: 2.05, kind: "do", run: () => setPhones("streaming", "connecting") },
      { at: 3.1, kind: "do", run: () => setPhones("streaming", "streaming") },
      { at: 3.4, kind: "move", to: phonesRow, dur: 0.6, dx: 0.15 },
      { at: 4.05, kind: "click" },
      { at: 4.1, kind: "do", run: clickPhonesRow },
      { at: 4.3, kind: "ring", target: ".dock .count", dur: 2.0 },
    ],
  },
  {
    id: "handover",
    actions: [
      { at: 0.4, kind: "move", to: tile("Buds:"), dur: 0.8, dx: 0.45 },
      { at: 1.3, kind: "click" },
      { at: 1.35, kind: "do", run: () => setBuds("disconnecting") },
      { at: 2.2, kind: "do", run: () => setBuds("disconnected") },
    ],
  },
  {
    id: "hotkey",
    actions: [
      { at: 0.1, kind: "move", to: { x: 120, y: 470 }, dur: 0.8 },
      { at: 0.7, kind: "keys", labels: ["Ctrl", "Alt", "B"], dur: 1.7 },
      { at: 1.0, kind: "do", run: () => setBuds("connecting") },
      { at: 2.2, kind: "do", run: () => setBuds("connected") },
    ],
  },
  {
    id: "end",
    actions: [{ at: 0.2, kind: "end" }],
  },
];
