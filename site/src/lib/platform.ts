import { useState } from "react";

export type Os = "windows" | "mac" | "other";

/** Which computer the visitor is on. iPhones and iPads count as "other": the app doesn't run there. */
export function detectOs(): Os {
  if (typeof navigator === "undefined") return "windows";
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const platform = nav.userAgentData?.platform ?? navigator.platform ?? "";
  const ua = navigator.userAgent;
  if (/win/i.test(platform) || /Windows NT/i.test(ua)) return "windows";
  // iPadOS asks for the desktop site and calls itself a Mac; it has a touch screen, a Mac doesn't.
  const touch = navigator.maxTouchPoints > 1;
  if ((/mac/i.test(platform) || /Macintosh/i.test(ua)) && !touch) return "mac";
  return "other";
}

/** The visitor's OS. The site has no server rendering, so it is known on the first render. */
export function useOs(): Os {
  const [os] = useState(detectOs);
  return os;
}

/** The hotkey as each system writes it. */
export function hotkeyText(os: Os) {
  return os === "mac" ? "⌃⌥B" : "Ctrl+Alt+B";
}
