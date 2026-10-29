import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

// A tiny copy of the app's dock logic, enough to drive the hero picture and the
// clickable dock. It mirrors what the real dock shows; nothing here talks to Bluetooth.

export type BudsState = "on" | "releasing" | "off" | "connecting";
export type PhoneState = "off" | "connecting" | "playing";
export type Link = "off" | "busy" | "on";

type State = {
  buds: BudsState;
  phone: PhoneState;
  reconnect: boolean;
  /** goes up by one on every hotkey press, so keycaps can flash */
  hotkey: number;
  /** the visitor clicked or pressed something: the guided tour stops for good */
  takenOver: boolean;
};

type Action =
  | { type: "buds"; user?: boolean }
  | { type: "phone"; user?: boolean }
  | { type: "reconnect"; user?: boolean }
  | { type: "hotkey"; user?: boolean }
  | { type: "settle-buds" }
  | { type: "settle-phone" };

const initial: State = { buds: "on", phone: "off", reconnect: true, hotkey: 0, takenOver: false };

function toggleBuds(buds: BudsState): BudsState {
  if (buds === "on" || buds === "connecting") return "releasing";
  return "connecting";
}

function reducer(s: State, a: Action): State {
  const takenOver = s.takenOver || ("user" in a && !!a.user);
  switch (a.type) {
    case "buds":
      return { ...s, takenOver, buds: toggleBuds(s.buds) };
    case "hotkey":
      return { ...s, takenOver, buds: toggleBuds(s.buds), hotkey: s.hotkey + 1 };
    case "phone":
      return { ...s, takenOver, phone: s.phone === "off" ? "connecting" : "off" };
    case "reconnect":
      return { ...s, takenOver, reconnect: !s.reconnect };
    case "settle-buds":
      if (s.buds === "connecting") return { ...s, buds: "on" };
      if (s.buds === "releasing") return { ...s, buds: "off" };
      return s;
    case "settle-phone":
      return s.phone === "connecting" ? { ...s, phone: "playing" } : s;
  }
}

export type View = {
  headline: string;
  detail: string;
  sources: number;
  sourcesLabel: string;
  phoneLink: Link;
  budsLink: Link;
  phoneCaption: string;
  laptopCaption: string;
  budsCaption: string;
  budsTile: { value: string; tone: "accent" | "busy" | "muted" };
  phoneTile: { value: string; tone: "phone" | "busy" | "muted" };
  handedBack: boolean;
};

export function describe(s: State): View {
  const budsHere = s.buds === "on";
  const playing = s.phone === "playing";
  const sources = budsHere ? 1 + (playing ? 1 : 0) : 0;

  let headline = "Buds on this laptop";
  let detail = "Buds connected · phone audio off";
  if (s.buds === "connecting") {
    headline = "Connecting your buds…";
    detail = "Taking the buds back from the phone";
  } else if (s.buds === "releasing") {
    headline = "Handing the buds back…";
    detail = "Releasing them for your phone";
  } else if (s.buds === "off") {
    headline = "Buds free for your phone";
    detail = `Press Ctrl+Alt+B to bring them back`;
  } else if (s.phone === "connecting") {
    headline = "Connecting your phone…";
    detail = "Phone audio is starting";
  } else if (playing) {
    headline = "Hearing phone + laptop";
    detail = "Buds on this laptop · phone playing through it";
  }

  return {
    headline,
    detail,
    sources,
    sourcesLabel: sources === 2 ? "phone + laptop" : sources === 1 ? "laptop" : "none",
    phoneLink: s.phone === "playing" ? "on" : s.phone === "connecting" ? "busy" : "off",
    budsLink: s.buds === "on" ? "on" : s.buds === "off" ? "off" : "busy",
    phoneCaption: s.phone === "playing" ? "Playing" : s.phone === "connecting" ? "Connecting…" : "Off",
    laptopCaption: !budsHere ? "Buds released" : playing ? "Mixing phone + laptop" : "Playing to buds",
    budsCaption:
      s.buds === "on"
        ? sources === 2
          ? "Hearing both"
          : "Connected"
        : s.buds === "off"
          ? "Free for the phone"
          : s.buds === "connecting"
            ? "Connecting…"
            : "Releasing…",
    budsTile:
      s.buds === "on"
        ? { value: "Connected", tone: "accent" }
        : s.buds === "off"
          ? { value: "Released", tone: "muted" }
          : { value: s.buds === "connecting" ? "Connecting…" : "Releasing…", tone: "busy" },
    phoneTile:
      s.phone === "playing"
        ? { value: "Playing", tone: "phone" }
        : s.phone === "connecting"
          ? { value: "Connecting…", tone: "busy" }
          : { value: "Off", tone: "muted" },
    handedBack: s.buds === "off",
  };
}

type Ctx = {
  state: State;
  view: View;
  toggleBuds: () => void;
  togglePhone: () => void;
  toggleReconnect: () => void;
  pressHotkey: () => void;
  /** attach to the element whose visibility should run or pause the guided tour */
  watch: (el: Element | null) => void;
};

const DemoContext = createContext<Ctx | null>(null);

const TOUR: { wait: number; act: Action["type"] }[] = [
  { wait: 1600, act: "phone" },
  { wait: 4200, act: "hotkey" },
  { wait: 3400, act: "hotkey" },
  { wait: 3800, act: "phone" },
  { wait: 2600, act: "reconnect" },
  { wait: 1400, act: "reconnect" },
];

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initial);
  const [visible, setVisible] = useState(true);
  const observer = useRef<IntersectionObserver | null>(null);

  // Connecting and releasing take a moment, like the real thing.
  useEffect(() => {
    if (state.buds !== "connecting" && state.buds !== "releasing") return;
    const t = setTimeout(() => dispatch({ type: "settle-buds" }), state.buds === "connecting" ? 1000 : 650);
    return () => clearTimeout(t);
  }, [state.buds]);

  useEffect(() => {
    if (state.phone !== "connecting") return;
    const t = setTimeout(() => dispatch({ type: "settle-phone" }), 1200);
    return () => clearTimeout(t);
  }, [state.phone]);

  // The guided tour: plays until the visitor touches anything, and pauses off-screen.
  const step = useRef(0);
  useEffect(() => {
    if (state.takenOver || !visible) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const { wait, act } = TOUR[step.current % TOUR.length];
    const t = setTimeout(() => {
      step.current += 1;
      dispatch({ type: act });
    }, wait);
    return () => clearTimeout(t);
  }, [state, visible]);

  // The real shortcut works here too.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && !e.shiftKey && e.key.toLowerCase() === "b") {
        e.preventDefault();
        dispatch({ type: "hotkey", user: true });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const watch = useCallback((el: Element | null) => {
    observer.current?.disconnect();
    if (!el) return;
    observer.current = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      threshold: 0.15,
    });
    observer.current.observe(el);
  }, []);

  const value = useMemo<Ctx>(
    () => ({
      state,
      view: describe(state),
      toggleBuds: () => dispatch({ type: "buds", user: true }),
      togglePhone: () => dispatch({ type: "phone", user: true }),
      toggleReconnect: () => dispatch({ type: "reconnect", user: true }),
      pressHotkey: () => dispatch({ type: "hotkey", user: true }),
      watch,
    }),
    [state, watch],
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo needs a DemoProvider");
  return ctx;
}
