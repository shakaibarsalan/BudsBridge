import { AnimatePresence, motion, useInView, useMotionValue, useSpring, useTransform } from "motion/react";
import { useEffect, useRef, useState, type PointerEvent as RPointerEvent, type ReactNode } from "react";
import dockDark from "../../../docs/media/dock.png";
import dockDevices from "../../../docs/media/dock-devices.png";
import dockLight from "../../../docs/media/dock-light.png";
import { IconLock, IconMoon, IconRocket, IconSun } from "../components/Icons";
import { HotkeyKeys } from "../components/Keys";
import { Reveal } from "../components/Reveal";

/** A card that tilts a little toward the pointer and lights up under it. */
function Card({ className = "", children, delay = 0 }: { className?: string; children: ReactNode; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [3, -3]), { stiffness: 160, damping: 20 });
  const ry = useSpring(useTransform(mx, [0, 1], [-3, 3]), { stiffness: 160, damping: 20 });

  const onMove = (e: RPointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = ref.current!.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width);
    my.set((e.clientY - r.top) / r.height);
    ref.current!.style.setProperty("--mx", `${e.clientX - r.left}px`);
    ref.current!.style.setProperty("--my", `${e.clientY - r.top}px`);
  };
  const onLeave = () => {
    mx.set(0.5);
    my.set(0.5);
  };

  return (
    <Reveal delay={delay} className={`fcard ${className}`}>
      <motion.div ref={ref} className="fcard__inner" style={{ rotateX: rx, rotateY: ry }} onPointerMove={onMove} onPointerLeave={onLeave}>
        <div className="fcard__spot" aria-hidden />
        {children}
      </motion.div>
    </Reveal>
  );
}

function useActive(threshold = 0.4) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { amount: threshold });
  return [ref, inView] as const;
}

function useTicker(active: boolean, ms: number, n: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setI((x) => (x + 1) % n), ms);
    return () => clearInterval(t);
  }, [active, ms, n]);
  return i;
}

function TrayDock() {
  const [ref, on] = useActive(0.35);
  return (
    <div ref={ref} className={`ftray ${on ? "is-on" : ""}`}>
      <img src={dockDevices} alt="The BudsBridge dock with the device list open" className="ftray__dock" loading="lazy" />
      <div className="ftray__bar" aria-hidden>
        <span className="ftray__apps">
          <i />
          <i />
          <i />
          <i />
        </span>
        <span className="ftray__tray">
          <i className="ftray__bb" />
          10:42
        </span>
      </div>
    </div>
  );
}

const PHONE_RETRIES = ["5 s", "10 s", "20 s", "40 s", "every min"];

function PhoneRetry() {
  const [ref, on] = useActive();
  const i = useTicker(on, 900, PHONE_RETRIES.length + 2);
  return (
    <div ref={ref} className="fretry">
      <div className="fretry__line">
        {PHONE_RETRIES.map((r, n) => (
          <span key={r} className={`fretry__dot ${n < i ? "is-done" : ""} ${n === i - 1 ? "is-now" : ""}`}>
            <i />
            <em>{r}</em>
          </span>
        ))}
      </div>
      <div className={`fretry__status ${i > PHONE_RETRIES.length ? "is-back" : ""}`}>
        {i > PHONE_RETRIES.length ? "Phone is back, playing again" : "Phone went away, waiting…"}
      </div>
    </div>
  );
}

const APPS = ["Chrome", "Zoom", "VS Code", "a game", "Spotify"];

function Hotkey() {
  const [ref, on] = useActive();
  const i = useTicker(on, 1600, APPS.length);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (on) setPulse((p) => p + 1);
  }, [i, on]);
  return (
    <div ref={ref} className="fhot">
      <HotkeyKeys pulse={pulse} />
      <div className="fhot__app">
        from{" "}
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.b key={APPS[i]} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
            {APPS[i]}
          </motion.b>
        </AnimatePresence>
      </div>
    </div>
  );
}

const BACKOFF = [1, 2, 4, 8, 16, 30, 30, 30];

function Backoff() {
  const [ref, on] = useActive();
  return (
    <div ref={ref} className={`fback ${on ? "is-on" : ""}`}>
      {BACKOFF.map((s, i) => (
        <span key={i} className="fback__bar" style={{ ["--h" as string]: `${Math.max(12, (s / 30) * 100)}%`, transitionDelay: `${i * 70}ms` }}>
          <em>{s}s</em>
        </span>
      ))}
    </div>
  );
}

const STATES = [
  { t: "Connecting…", tone: "busy" },
  { t: "Connected", tone: "accent" },
  { t: "Disconnecting…", tone: "busy" },
  { t: "Disconnected", tone: "muted" },
];

function States() {
  const [ref, on] = useActive();
  const i = useTicker(on, 1200, STATES.length);
  return (
    <div ref={ref} className="fstates">
      {STATES.map((s, n) => (
        <span key={s.t} className={`fstate fstate--${s.tone} ${n === i ? "is-now" : ""}`}>
          <i />
          {s.t}
        </span>
      ))}
    </div>
  );
}

/** Drag across to compare the light and dark dock. */
function Compare() {
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const [dragging, setDragging] = useState(false);
  const [ref, on] = useActive(0.5);
  const touched = useRef(false);

  // Sweep once on its own so people see it moves.
  useEffect(() => {
    if (!on || touched.current) return;
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min((now - start) / 1800, 1);
      setPos(50 + Math.sin(t * Math.PI * 2) * 28);
      if (t < 1 && !touched.current) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [on]);

  const setFrom = (clientX: number) => {
    const r = box.current!.getBoundingClientRect();
    setPos(Math.min(100, Math.max(0, ((clientX - r.left) / r.width) * 100)));
  };

  return (
    <div ref={ref}>
      <div
        ref={box}
        className={`fcompare ${dragging ? "is-dragging" : ""}`}
        onPointerDown={(e) => {
          touched.current = true;
          setDragging(true);
          (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
          setFrom(e.clientX);
        }}
        onPointerMove={(e) => dragging && setFrom(e.clientX)}
        onPointerUp={() => setDragging(false)}
        onPointerCancel={() => setDragging(false)}
      >
        <img src={dockDark} alt="The dock in dark mode" loading="lazy" draggable={false} />
        <img
          src={dockLight}
          alt="The dock in light mode"
          loading="lazy"
          draggable={false}
          className="fcompare__top"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
        />
        <div className="fcompare__handle" style={{ left: `${pos}%` }}>
          <span>
            <IconSun />
            <IconMoon />
          </span>
        </div>
        <input
          className="fcompare__range"
          type="range"
          min={0}
          max={100}
          value={Math.round(pos)}
          aria-label="Compare light and dark mode"
          onChange={(e) => {
            touched.current = true;
            setPos(Number(e.target.value));
          }}
        />
      </div>
    </div>
  );
}

function Counter({ to, on }: { to: number; on: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!on) return;
    if (to === 0) {
      // Count down from a few to show it really is nothing.
      let v = 3;
      setN(v);
      const t = setInterval(() => {
        v -= 1;
        setN(Math.max(v, 0));
        if (v <= 0) clearInterval(t);
      }, 220);
      return () => clearInterval(t);
    }
    setN(to);
  }, [on, to]);
  return <b>{n}</b>;
}

function Private() {
  const [ref, on] = useActive();
  return (
    <div ref={ref} className="fprivate">
      <div>
        <Counter to={0} on={on} />
        <span>accounts</span>
      </div>
      <div>
        <Counter to={0} on={on} />
        <span>servers</span>
      </div>
      <div>
        <Counter to={0} on={on} />
        <span>phone apps</span>
      </div>
      <div className="is-one">
        <Counter to={1} on={on} />
        <span>.exe</span>
      </div>
    </div>
  );
}

function Autostart() {
  const [ref, on] = useActive();
  return (
    <div ref={ref} className={`fauto ${on ? "is-on" : ""}`}>
      <span className="fauto__switch">
        <i />
      </span>
      <span>Start with Windows</span>
    </div>
  );
}

export function Features() {
  return (
    <section className="section features" id="features">
      <div className="container">
        <Reveal className="section-head">
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            Features
          </span>
          <h2 className="h-section">
            Small app. <span className="grad-text">Does the boring parts for you.</span>
          </h2>
          <p className="lede">Everything sits one click from the tray, and most of it you'll never have to touch twice.</p>
        </Reveal>

        <div className="bento">
          <Card className="b-tray">
            <div className="fcard__copy">
              <h3>A dock in your tray</h3>
              <p>
                Click the tray icon and a small panel opens beside it: what plays where, how many sources reach your buds, and
                four tiles that are also the switches. It closes when you click away.
              </p>
            </div>
            <TrayDock />
          </Card>

          <Card className="b-retry" delay={0.06}>
            <div className="fcard__copy">
              <h3>Phone audio that stays on</h3>
              <p>If the phone walks away, BudsBridge waits and reconnects. It even turns itself back on after a restart.</p>
            </div>
            <PhoneRetry />
          </Card>

          <Card className="b-back" delay={0.12}>
            <div className="fcard__copy">
              <h3>Comes back after drops</h3>
              <p>
                Out of range or case closed? It retries 8 times, from 1 s up to 30 s. It never retries after <em>you</em>{" "}
                disconnect, so the laptop won't fight your phone.
              </p>
            </div>
            <Backoff />
          </Card>

          <Card className="b-compare">
            <div className="fcard__copy">
              <h3>Looks like Windows 11</h3>
              <p>Mica backdrop, and light and dark follow your system. Drag to compare.</p>
            </div>
            <Compare />
          </Card>

          <Card className="b-hot" delay={0.06}>
            <div className="fcard__copy">
              <h3>One hotkey, any app</h3>
              <p>Ctrl+Alt+B toggles your buds from anywhere. Change it, or turn it off.</p>
            </div>
            <Hotkey />
          </Card>

          <Card className="b-states" delay={0.12}>
            <div className="fcard__copy">
              <h3>No endless spinners</h3>
              <p>You always see the real state. If the buds don't answer in 15 s, you get a clear message.</p>
            </div>
            <States />
          </Card>

          <Card className="b-private">
            <div className="fcard__copy">
              <h3>
                <IconLock /> Stays on your PC
              </h3>
              <p>Everything runs on your machine. One small file, no sign-up, nothing to install on the phone.</p>
            </div>
            <Private />
          </Card>

          <Card className="b-auto" delay={0.06}>
            <div className="fcard__copy">
              <h3>
                <IconRocket /> Ready when you are
              </h3>
              <p>Starts with Windows, minimized to the tray, with the hotkey ready.</p>
            </div>
            <Autostart />
          </Card>
        </div>
      </div>
    </section>
  );
}
