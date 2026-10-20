import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { App } from "./App";
import { api } from "./lib/api";
import type { AppInfo, DeviceView, Settings } from "./lib/types";

vi.mock("./lib/api", () => ({
  api: {
    appInfo: vi.fn(),
    listDevices: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    onDevicesChanged: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

const settings: Settings = {
  version: 1,
  autoReconnect: true,
  reconnect: { initialDelayMs: 1000, maxDelayMs: 30000, maxAttempts: 8 },
  connectTimeoutMs: 15000,
  preferredDevice: null,
  toggleHotkey: "Ctrl+Alt+B",
  startWithWindows: false,
};

const info: AppInfo = { backend: "demo", version: "0.1.0", mica: false, warnings: [] };

const buds: DeviceView = {
  id: "buds",
  name: "Test Buds",
  profiles: ["stereo"],
  state: "disconnected",
  reconnectAttempt: null,
  lastError: null,
};

let pushDevices: (devices: DeviceView[]) => void = () => {};

beforeEach(() => {
  mocked.appInfo.mockResolvedValue(info);
  mocked.getSettings.mockResolvedValue(settings);
  mocked.listDevices.mockResolvedValue([buds]);
  mocked.connect.mockResolvedValue(undefined);
  mocked.disconnect.mockResolvedValue(undefined);
  mocked.updateSettings.mockImplementation(async () => info);
  mocked.onDevicesChanged.mockImplementation(async (handler) => {
    pushDevices = handler;
    return () => {};
  });
});

describe("App", () => {
  it("lists devices and flags demo mode", async () => {
    render(<App />);
    expect(await screen.findByText("Test Buds")).toBeInTheDocument();
    expect(screen.getByText("Demo mode: simulated devices")).toBeInTheDocument();
    expect(await screen.findByText("v0.1.0")).toBeInTheDocument();
  });

  it("connects a disconnected device", async () => {
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Connect Test Buds" }));
    expect(mocked.connect).toHaveBeenCalledWith("buds");
  });

  it("follows live updates from the runtime", async () => {
    render(<App />);
    await screen.findByText("Not connected");
    act(() => pushDevices([{ ...buds, state: "connected" }]));
    const card = screen.getByRole("listitem", { name: "Test Buds" });
    expect(within(card).getByText("Connected")).toBeInTheDocument();
    await userEvent.click(within(card).getByRole("button", { name: "Disconnect Test Buds" }));
    expect(mocked.disconnect).toHaveBeenCalledWith("buds");
  });

  it("shows an empty state", async () => {
    mocked.listDevices.mockResolvedValue([]);
    render(<App />);
    expect(await screen.findByText(/No paired Bluetooth audio devices/)).toBeInTheDocument();
  });

  it("saves settings and shows warnings", async () => {
    mocked.updateSettings.mockResolvedValue({
      ...info,
      warnings: ["Hotkey Ctrl+Alt+B is already used by another app."],
    });
    render(<App />);
    await userEvent.click(await screen.findByRole("checkbox", { name: /Auto-reconnect/ }));
    expect(mocked.updateSettings).toHaveBeenCalledWith({ ...settings, autoReconnect: false });
    expect(await screen.findByText(/already used by another app/)).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Auto-reconnect/ })).not.toBeChecked();
  });

  it("saves the hotkey and the hotkey target", async () => {
    render(<App />);
    const input = await screen.findByLabelText("Toggle hotkey");
    await userEvent.clear(input);
    await userEvent.type(input, "Ctrl+Shift+F9");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(mocked.updateSettings).toHaveBeenLastCalledWith({
      ...settings,
      toggleHotkey: "Ctrl+Shift+F9",
    });

    await userEvent.click(screen.getByRole("radio", { name: "Hotkey target" }));
    expect(mocked.updateSettings).toHaveBeenLastCalledWith(
      expect.objectContaining({ preferredDevice: "buds" }),
    );
  });

  it("reports failed requests", async () => {
    mocked.connect.mockRejectedValue("device is not paired");
    render(<App />);
    await userEvent.click(await screen.findByRole("button", { name: "Connect Test Buds" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("device is not paired");
  });
});
