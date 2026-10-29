// The BudsBridge help agent, run by Talkfront. It only loads when a public widget key
// is set at build time (VITE_TALKFRONT_KEY), so the site works the same without it.

type TalkfrontApi = { q?: unknown[][]; open?: () => void; close?: () => void };
declare global {
  interface Window {
    Talkfront?: TalkfrontApi;
  }
}

const APP_URL = (import.meta.env.VITE_TALKFRONT_URL as string | undefined) ?? "https://talkfront-ai.vercel.app";
const KEY = import.meta.env.VITE_TALKFRONT_KEY as string | undefined;

export const supportEnabled = !!KEY;

/** Adds the widget script once the page has settled, so it never slows the first paint. */
export function loadSupport() {
  if (!KEY) return;
  const add = () => {
    if (document.querySelector("script[data-talkfront]")) return;
    const s = document.createElement("script");
    s.src = `${APP_URL}/widget.js`;
    s.async = true;
    s.dataset.key = KEY;
    s.dataset.talkfront = "";
    document.body.appendChild(s);
  };
  if ("requestIdleCallback" in window) requestIdleCallback(add, { timeout: 3000 });
  else setTimeout(add, 1500);
}

/** Opens the help panel, or queues the call until the widget has loaded. */
export function openSupport() {
  const tf = (window.Talkfront ??= { q: [] });
  if (typeof tf.open === "function") tf.open();
  else (tf.q ??= []).push(["open"]);
}
