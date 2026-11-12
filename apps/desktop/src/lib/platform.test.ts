import { describe, expect, it } from "vitest";

import { detectPlatform, formatHotkey, words } from "./platform";

const WEBVIEW2 =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0";
const WKWEBVIEW =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)";
const WEBKITGTK = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/605.1.15 (KHTML, like Gecko)";

describe("detectPlatform", () => {
  it("tells the Windows and macOS web views apart", () => {
    expect(detectPlatform(WEBVIEW2)).toBe("windows");
    expect(detectPlatform(WKWEBVIEW)).toBe("macos");
  });

  it("words anything else like Windows (demo recordings, tests)", () => {
    expect(detectPlatform(WEBKITGTK)).toBe("windows");
    expect(detectPlatform("")).toBe("windows");
    expect(detectPlatform()).toBe("windows"); // jsdom
  });
});

describe("words", () => {
  it("names the system's own settings and autostart", () => {
    expect(words("windows").pairIn).toBe("Windows Settings → Bluetooth & devices");
    expect(words("windows").startAtLogin).toBe("Start with Windows");
    expect(words("macos").pairIn).toBe("System Settings → Bluetooth");
    expect(words("macos").startAtLogin).toBe("Open at login");
    expect(words("macos").computer).toBe("Mac");
  });
});

describe("formatHotkey", () => {
  it("uses the Mac symbols in menu order", () => {
    expect(formatHotkey("Ctrl+Alt+B", "macos")).toBe("⌃⌥B");
    expect(formatHotkey("Shift+Cmd+F9", "macos")).toBe("⇧⌘F9");
    expect(formatHotkey("alt + ctrl + b", "macos")).toBe("⌃⌥B");
    expect(formatHotkey("CmdOrCtrl+Shift+K", "macos")).toBe("⇧⌘K");
  });

  it("keeps the hotkey as typed on Windows", () => {
    expect(formatHotkey("Ctrl+Alt+B", "windows")).toBe("Ctrl+Alt+B");
  });
});
