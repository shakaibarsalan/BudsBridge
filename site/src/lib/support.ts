// The BudsBridge help agent, run by Halochime. It only loads when a public widget key
// is set at build time (VITE_HALOCHIME_KEY), so the site works the same without it.

type HalochimeApi = { q?: unknown[][]; open?: () => void; close?: () => void };
declare global {
  interface Window {
    Halochime?: HalochimeApi;
  }
}

const APP_URL = (import.meta.env.VITE_HALOCHIME_URL as string | undefined) ?? "https://halochime.vercel.app";
const KEY = import.meta.env.VITE_HALOCHIME_KEY as string | undefined;

export const supportEnabled = !!KEY;

/** Adds the widget script once the page has settled, so it never slows the first paint. */
export function loadSupport() {
  if (!KEY) return;
  const add = () => {
    if (document.querySelector("script[data-halochime]")) return;
    const s = document.createElement("script");
    s.src = `${APP_URL}/widget.js`;
    s.async = true;
    s.dataset.key = KEY;
    s.dataset.halochime = "";
    document.body.appendChild(s);
  };
  if ("requestIdleCallback" in window) requestIdleCallback(add, { timeout: 3000 });
  else setTimeout(add, 1500);
}

/** Opens the help panel, or queues the call until the widget has loaded. */
export function openSupport() {
  const hc = (window.Halochime ??= { q: [] });
  if (typeof hc.open === "function") hc.open();
  else (hc.q ??= []).push(["open"]);
}
