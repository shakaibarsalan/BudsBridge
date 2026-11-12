/** The desktop system BudsBridge runs on, as far as the wording goes. */
export type Platform = "windows" | "macos";

/**
 * WebView2 reports "Windows NT", the macOS WebView "Macintosh". Anything else
 * (the Linux demo recordings, tests) is worded like Windows.
 */
export function detectPlatform(
  userAgent: string = typeof navigator === "undefined" ? "" : navigator.userAgent,
): Platform {
  return /Macintosh|Mac OS X/.test(userAgent) ? "macos" : "windows";
}

export interface Words {
  /** The operating system's name. */
  os: string;
  /** What the computer is called in sentences like "this laptop". */
  computer: string;
  /** Where Bluetooth devices are paired. */
  pairIn: string;
  /** The same, short enough for a tile. */
  pairShort: string;
  /** The autostart switch. */
  startAtLogin: string;
  startAtLoginDetail: string;
  /** Where BudsBridge's icon lives. */
  iconPlace: string;
}

const WORDS: Record<Platform, Words> = {
  windows: {
    os: "Windows",
    computer: "laptop",
    pairIn: "Windows Settings → Bluetooth & devices",
    pairShort: "Pair in Windows",
    startAtLogin: "Start with Windows",
    startAtLoginDetail: "Opens in the tray, ready for the hotkey.",
    iconPlace: "tray",
  },
  macos: {
    os: "macOS",
    computer: "Mac",
    pairIn: "System Settings → Bluetooth",
    pairShort: "Pair in Settings",
    startAtLogin: "Open at login",
    startAtLoginDetail: "Starts in the menu bar, ready for the hotkey.",
    iconPlace: "menu bar",
  },
};

export function words(platform: Platform = detectPlatform()): Words {
  return WORDS[platform];
}

const MAC_MODIFIERS: Record<string, string> = {
  control: "⌃",
  ctrl: "⌃",
  alt: "⌥",
  option: "⌥",
  shift: "⇧",
  cmd: "⌘",
  command: "⌘",
  super: "⌘",
  meta: "⌘",
  cmdorctrl: "⌘",
  commandorcontrol: "⌘",
};
const MAC_ORDER = ["⌃", "⌥", "⇧", "⌘"];

/** `Ctrl+Alt+B` reads `⌃⌥B` on a Mac, in the order macOS menus use; Windows keeps it as typed. */
export function formatHotkey(hotkey: string, platform: Platform = detectPlatform()): string {
  if (platform !== "macos") return hotkey;
  const parts = hotkey
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const key = parts.pop() ?? "";
  const modifiers = parts
    .map((part) => MAC_MODIFIERS[part.toLowerCase()] ?? part)
    .sort((a, b) => MAC_ORDER.indexOf(a) - MAC_ORDER.indexOf(b));
  return modifiers.join("") + (key.length === 1 ? key.toUpperCase() : key);
}
