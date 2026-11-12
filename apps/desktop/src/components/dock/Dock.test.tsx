import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { api } from "../../lib/api";
import type { AppInfo, DeviceView, Settings, SourceView } from "../../lib/types";
import { Dock } from "./Dock";

vi.mock("../../lib/api", () => ({
  api: {
    appInfo: vi.fn(),
    listDevices: vi.fn(),
    connect: vi.fn(),
    disconnect: vi.fn(),
    getSettings: vi.fn(),
    updateSettings: vi.fn(),
    onDevicesChanged: vi.fn(),
    onSettingsChanged: vi.fn(),
    listSources: vi.fn(),
    setSourceEnabled: vi.fn(),
    onSourcesChanged: vi.fn(),
    listUnavailablePhones: vi.fn(),
    airplayReceiver: vi.fn(),
    openSystemSettings: vi.fn(),
    diagnostics: vi.fn(),
    openSettings: vi.fn(),
    quitApp: vi.fn(),
    dockResize: vi.fn(),
    hideDock: vi.fn(),
  },
}));

const mocked = vi.mocked(api);

const settings: Settings = {
  version: 1,
  autoReconnect: true,
  reconnect: { initialDelayMs: 1000, maxDelayMs: 30000, maxAttempts: 8 },
  connectTimeoutMs: 15000,
  preferredDevice: "tws",
  toggleHotkey: "Ctrl+Alt+B",
  startWithWindows: false,
  bridgedPhones: [],
};

const tws: DeviceView = {
  id: "tws",
  name: "TWS",
  profiles: ["stereo"],
  state: "connected",
  reconnectAttempt: null,
  lastError: null,
  lastConnected: false,
};

const speaker: DeviceView = { ...tws, id: "speaker", name: "Speaker", state: "disconnected" };

const pixel: SourceView = { id: "pixel", name: "Pixel 7", enabled: false, state: "off", lastError: null };

let pushSources: (sources: SourceView[]) => void = () => {};

beforeEach(() => {
  mocked.appInfo.mockResolvedValue({ backend: "windows", version: "0.3.0", mica: false, warnings: [] } satisfies AppInfo);
  mocked.getSettings.mockResolvedValue(settings);
  mocked.listDevices.mockResolvedValue([tws, speaker]);
  mocked.listSources.mockResolvedValue([pixel]);
  mocked.listUnavailablePhones.mockResolvedValue([]);
  for (const fn of [
    mocked.connect,
    mocked.disconnect,
    mocked.setSourceEnabled,
    mocked.openSettings,
    mocked.quitApp,
    mocked.dockResize,
  ]) {
    fn.mockResolvedValue(undefined);
  }
  mocked.updateSettings.mockResolvedValue({ backend: "windows", version: "0.3.0", mica: false, warnings: [] });
  mocked.onDevicesChanged.mockResolvedValue(() => {});
  mocked.onSettingsChanged.mockResolvedValue(() => {});
  mocked.onSourcesChanged.mockImplementation(async (handler) => {
    pushSources = handler;
    return () => {};
  });
});

describe("Dock", () => {
  it("summarises the buds, the phone and the sound sources", async () => {
    render(<Dock />);
    expect(await screen.findByText("Buds on this laptop")).toBeInTheDocument();
    expect(screen.getByText("TWS connected · phone audio off")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("source")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(/Pixel 7: off\. TWS: connected/);
  });

  it("shows phone audio playing as two sources", async () => {
    render(<Dock />);
    await screen.findByText("Buds on this laptop");
    act(() => pushSources([{ ...pixel, enabled: true, state: "streaming" }]));
    expect(screen.getByText("Hearing phone + laptop")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText("phone + laptop")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Phone audio: Playing phone audio/ })).toBeInTheDocument();
  });

  it("shows every phone that plays, and counts them", async () => {
    render(<Dock />);
    await screen.findByText("Buds on this laptop");
    const oppo: SourceView = { ...pixel, id: "oppo", name: "OPPO A83" };
    act(() =>
      pushSources([
        { ...oppo, enabled: true, state: "streaming" },
        { ...pixel, enabled: true, state: "streaming" },
      ]),
    );
    expect(screen.getByText("Hearing 2 phones + laptop")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("2 phones + laptop")).toBeInTheDocument();
    expect(screen.getByText("2 phones")).toBeInTheDocument();
    expect(screen.getByRole("img")).toHaveAccessibleName(
      /OPPO A83: playing phone audio\. Pixel 7: playing phone audio\. TWS: connected/,
    );
  });

  it("controls everything from the tiles", async () => {
    render(<Dock />);
    await userEvent.click(await screen.findByRole("button", { name: "Buds: Connected" }));
    expect(mocked.disconnect).toHaveBeenCalledWith("tws");

    await userEvent.click(screen.getByRole("button", { name: "Phone audio: Off" }));
    expect(mocked.setSourceEnabled).toHaveBeenCalledWith("pixel", true);

    await userEvent.click(screen.getByRole("button", { name: "Auto-reconnect on" }));
    expect(mocked.updateSettings).toHaveBeenCalledWith({ ...settings, autoReconnect: false });

    await userEvent.click(screen.getByRole("button", { name: /Hotkey: Ctrl\+Alt\+B/ }));
    expect(mocked.openSettings).toHaveBeenCalled();
  });

  it("toggles the buds with the power button", async () => {
    render(<Dock />);
    await userEvent.click(await screen.findByRole("button", { name: "Disconnect TWS" }));
    expect(mocked.disconnect).toHaveBeenCalledWith("tws");
  });

  it("opens the device and phone lists in place", async () => {
    render(<Dock />);
    const devices = await screen.findByRole("button", { name: /Devices/ });
    expect(devices).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(devices);
    expect(devices).toHaveAttribute("aria-expanded", "true");
    const row = screen.getByRole("listitem", { name: "Speaker" });
    await userEvent.click(within(row).getByRole("button", { name: "Connect Speaker" }));
    expect(mocked.connect).toHaveBeenCalledWith("speaker");

    await userEvent.click(screen.getByRole("button", { name: /Phones/ }));
    expect(devices).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(screen.getByRole("switch", { name: "Hear Pixel 7 in my buds" }));
    expect(mocked.setSourceEnabled).toHaveBeenCalledWith("pixel", true);
  });

  it("opens settings, starts with Windows and quits from the menu", async () => {
    render(<Dock />);
    await userEvent.click(await screen.findByRole("button", { name: "All settings" }));
    await userEvent.click(screen.getByRole("button", { name: "Open settings" }));
    expect(mocked.openSettings).toHaveBeenCalledTimes(2);

    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await userEvent.click(screen.getByRole("menuitemcheckbox", { name: "Start with Windows" }));
    expect(mocked.updateSettings).toHaveBeenCalledWith({ ...settings, startWithWindows: true });

    await userEvent.click(screen.getByRole("button", { name: "More" }));
    await userEvent.click(screen.getByRole("menuitem", { name: "Quit BudsBridge" }));
    expect(mocked.quitApp).toHaveBeenCalled();
  });

  it("explains what to do without paired devices", async () => {
    mocked.listDevices.mockResolvedValue([]);
    mocked.listSources.mockResolvedValue([]);
    render(<Dock />);
    expect(await screen.findByText("No buds paired")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("lists a paired phone Windows won't stream from, with what to do", async () => {
    mocked.listSources.mockResolvedValue([]);
    mocked.listUnavailablePhones.mockResolvedValue([{ name: "Pixel 7", reason: "noAudioService" }]);
    render(<Dock />);
    const tile = await screen.findByRole("button", { name: "Phone audio unavailable for Pixel 7. Show why" });
    expect(screen.getByRole("button", { name: /Phones/ })).toHaveTextContent("1 paired");

    await userEvent.click(tile);
    const row = screen.getByRole("listitem", { name: "Pixel 7" });
    expect(row).toHaveTextContent("Windows doesn't offer its audio");
    expect(within(row).queryByRole("switch")).not.toBeInTheDocument();
    expect(screen.getByText(/pair it again from the laptop/)).toBeInTheDocument();
  });

  it("shows the latest problem as a banner", async () => {
    mocked.listDevices.mockResolvedValue([{ ...tws, state: "disconnected", lastError: "Connection timed out." }]);
    render(<Dock />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Connection timed out.");
  });
});

describe("Dock on a Mac", () => {
  const MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";

  beforeEach(() => {
    Object.defineProperty(window.navigator, "userAgent", { value: MAC, configurable: true });
    mocked.listSources.mockResolvedValue([]);
    mocked.listUnavailablePhones.mockResolvedValue([{ name: "Pixel 7", reason: "notSupportedByOs" }]);
    mocked.airplayReceiver.mockResolvedValue(null);
    mocked.openSystemSettings.mockResolvedValue(undefined);
  });

  afterEach(() => {
    // Back to jsdom's own user agent on the prototype.
    delete (window.navigator as { userAgent?: string }).userAgent;
  });

  it("speaks of this Mac, the Mac hotkey symbols and Open at login", async () => {
    const user = userEvent.setup();
    render(<Dock />);
    expect(await screen.findByText("Buds on this Mac")).toBeInTheDocument();
    // The header and the status card; no "phone audio off" on a Mac.
    expect(screen.getAllByText("TWS connected")).toHaveLength(2);
    expect(screen.getByText("Mac")).toBeInTheDocument(); // the one sound source
    expect(screen.getByRole("button", { name: /Hotkey: ⌃⌥B/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "More" }));
    expect(screen.getByRole("menuitemcheckbox", { name: "Open at login" })).toBeInTheDocument();
  });

  it("offers AirPlay for phone audio and lists paired phones with the reason", async () => {
    const user = userEvent.setup();
    render(<Dock />);
    await screen.findByText("Buds on this Mac");
    await user.click(screen.getByRole("button", { name: /comes from an iPhone over AirPlay/ }));
    expect(screen.getByText(/tap AirPlay and choose this Mac/)).toBeInTheDocument();
    expect(screen.getByText(/Android phones can't play through it yet/)).toBeInTheDocument();
    const row = await screen.findByRole("listitem", { name: "Pixel 7" });
    expect(within(row).getByText("Can't play through a Mac over Bluetooth")).toBeInTheDocument();
    expect(screen.queryByRole("switch")).not.toBeInTheDocument();
    // AirPlay Receiver isn't known to be off, so there is nothing to turn on.
    expect(screen.queryByRole("button", { name: "Turn it on" })).not.toBeInTheDocument();
  });

  it("opens the AirPlay setting when AirPlay Receiver is off", async () => {
    mocked.airplayReceiver.mockResolvedValue(false);
    const user = userEvent.setup();
    render(<Dock />);
    await screen.findByText("Buds on this Mac");
    await user.click(screen.getByRole("button", { name: /comes from an iPhone over AirPlay/ }));
    await user.click(await screen.findByRole("button", { name: "Turn it on" }));
    expect(mocked.openSystemSettings).toHaveBeenCalledWith("airplay");
  });
});
