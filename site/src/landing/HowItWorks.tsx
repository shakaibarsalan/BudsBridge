import { AnimatePresence, motion, useInView, useMotionValueEvent, useScroll, useSpring } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { IconCheck, IconHeadphones, IconPhone } from "../components/Icons";
import { HotkeyKeys } from "../components/Keys";
import { Reveal } from "../components/Reveal";

function useLoop(active: boolean, ms: number, steps: number) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setI((n) => (n + 1) % steps), ms);
    return () => clearInterval(t);
  }, [active, ms, steps]);
  return i;
}

function PairVisual({ on }: { on: boolean }) {
  const step = useLoop(on, 1400, 4);
  const rows = [
    { icon: <IconHeadphones />, name: "Demo Buds", state: "Connected" },
    { icon: <IconPhone />, name: "Demo Phone", state: "Paired" },
  ];
  return (
    <div className="hv hv--settings">
      <div className="hv-settings__crumb">
        Settings <span>›</span> Bluetooth &amp; devices
      </div>
      {rows.map((r, i) => (
        <div key={r.name} className={`hv-settings__row ${step > i ? "is-done" : ""}`}>
          <span className="hv-settings__icon">{r.icon}</span>
          <span className="hv-settings__name">{r.name}</span>
          <span className="hv-settings__state">
            {step > i ? (
              <>
                <IconCheck /> {r.state}
              </>
            ) : (
              "Pairing…"
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

function PhoneAudioVisual({ on }: { on: boolean }) {
  const step = useLoop(on, 1300, 4); // off, connecting, playing, playing
  const value = step === 0 ? "Off" : step === 1 ? "Connecting…" : "Playing";
  const tone = step === 0 ? "muted" : step === 1 ? "busy" : "phone";
  return (
    <div className="hv hv--tile">
      <div className={`dtile dtile--${tone} hv-tile ${step >= 2 ? "is-active" : ""}`}>
        <span className="dtile__icon">
          <IconPhone />
        </span>
        <span className="dtile__text">
          <span className="dtile__label">Phone audio</span>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span key={value} className="dtile__value" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}>
              {value}
            </motion.span>
          </AnimatePresence>
          <span className="dtile__sub">Demo Phone</span>
        </span>
      </div>
      <div className="hv-tile__count">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.b key={step >= 2 ? 2 : 1} initial={{ opacity: 0, y: "50%" }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: "-50%" }}>
            {step >= 2 ? 2 : 1}
          </motion.b>
        </AnimatePresence>
        sources in your buds
      </div>
    </div>
  );
}

function HotkeyVisual({ on }: { on: boolean }) {
  const step = useLoop(on, 1800, 2);
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    if (on) setPulse((p) => p + 1);
  }, [step, on]);
  return (
    <div className="hv hv--keys">
      <HotkeyKeys pulse={pulse} />
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={step}
          className={`hv-keys__state ${step ? "is-phone" : ""}`}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
        >
          {step ? "Buds free for your phone" : "Buds back on the laptop"}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Pair once",
    body: "Pair your buds, and your phone if you want its audio, with the laptop in Bluetooth & devices. That's the only setup.",
    Visual: PairVisual,
  },
  {
    n: "02",
    title: "Turn on Phone audio",
    body: "One click on the Phone audio tile. The link turns green and your buds now play the phone and the laptop together. It stays on, even after a restart.",
    Visual: PhoneAudioVisual,
  },
  {
    n: "03",
    title: "Leaving? One key",
    body: "Walking away from the laptop? Ctrl+Alt+B, the tray menu or the Buds tile frees the buds for your phone, and brings them back when you return.",
    Visual: HotkeyVisual,
  },
];

function Step({ s, i }: { s: (typeof STEPS)[number]; i: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { margin: "-20% 0px -20% 0px" });
  return (
    <Reveal delay={i * 0.12} className="how__step">
      <div ref={ref} className="how__card">
        <div className="how__visual">
          <s.Visual on={inView} />
        </div>
        <div className="how__text">
          <span className="how__n">{s.n}</span>
          <h3>{s.title}</h3>
          <p>{s.body}</p>
        </div>
      </div>
    </Reveal>
  );
}

export function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.75", "center 0.5"] });
  const draw = useSpring(scrollYProgress, { stiffness: 90, damping: 22 });
  const [reached, setReached] = useState(0);
  useMotionValueEvent(draw, "change", (v) => setReached(v >= 0.98 ? 3 : v >= 0.5 ? 2 : v > 0.02 ? 1 : 0));

  return (
    <section className="section how" id="how" ref={ref}>
      <div className="container">
        <Reveal className="section-head section-head--center">
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            How it works
          </span>
          <h2 className="h-section">
            Set it up once. <span className="grad-text">Then forget it.</span>
          </h2>
          <p className="lede">Three steps, and the first one you've probably done already.</p>
        </Reveal>

        <div className="how__track">
          <div className="how__rail" aria-hidden>
            <motion.span className="how__rail-fill" style={{ scaleX: draw }} />
            {[0, 1, 2].map((i) => (
              <span key={i} className={`how__rail-dot ${reached > i ? "is-on" : ""}`} style={{ left: `${i * 50}%` }}>
                {STEPS[i].n}
              </span>
            ))}
          </div>
          <div className="how__steps">
            {STEPS.map((s, i) => (
              <Step key={s.n} s={s} i={i} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
