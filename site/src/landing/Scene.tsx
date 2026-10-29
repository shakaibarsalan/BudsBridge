import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "../components/Logo";
import { useDemo, type Link } from "../lib/demo";
import { Dock } from "./Dock";

// The hero picture: phone → laptop → buds, drawn on a fixed 1120 × 520 canvas and
// scaled to fit, so every line and dot keeps its place at any width.
const W = 1120;
const H = 520;

const PATH_PHONE = "M184,272 C 236,272 252,218 300,218";
const PATH_BUDS = "M860,218 C 902,218 912,268 952,268";
const PATH_BACK = "M1018,168 C 930,-58 232,-58 104,108";

function Beam({ d, link, color, id }: { d: string; link: Link; color: "green" | "blue"; id: string }) {
  return (
    <g className={`beam beam--${link} beam--${color}`}>
      <path d={d} className="beam__track" />
      <path d={d} className="beam__glow" />
      <path d={d} className="beam__line" id={id} />
      {link === "on" &&
        [0, 0.33, 0.66].map((offset) => (
          <circle key={offset} r="4.5" className="beam__dot">
            <animateMotion dur="1.6s" repeatCount="indefinite" begin={`${-offset * 1.6}s`}>
              <mpath href={`#${id}`} />
            </animateMotion>
          </circle>
        ))}
    </g>
  );
}

function PhoneDevice() {
  const { state } = useDemo();
  const playing = state.phone === "playing";
  return (
    <div className={`phone ${playing ? "is-playing" : ""}`} style={{ left: 24, top: 112 }}>
      <div className="phone__island" />
      <div className="phone__status">
        <span>9:41</span>
        <span className="phone__bars" />
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={state.phone}
          className={`phone__pill phone__pill--${state.phone}`}
          initial={{ opacity: 0, y: -6, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -6, scale: 0.96 }}
          transition={{ duration: 0.25 }}
        >
          <span className="phone__pill-dot" />
          {playing ? "Playing on Laptop" : state.phone === "connecting" ? "Connecting…" : "Not connected"}
        </motion.div>
      </AnimatePresence>
      <div className="phone__art">
        <div className="phone__art-disc" />
        <div className="eq" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <span key={i} style={{ animationDelay: `${i * -0.17}s` }} />
          ))}
        </div>
      </div>
      <div className="phone__track">Morning run mix</div>
      <div className="phone__artist">Your playlist</div>
      <div className="phone__progress">
        <span />
      </div>
      <div className="phone__controls" aria-hidden>
        <span className="phone__ctl phone__ctl--prev" />
        <span className={`phone__ctl phone__ctl--${playing ? "pause" : "play"}`} />
        <span className="phone__ctl phone__ctl--next" />
      </div>
    </div>
  );
}

function LaptopDevice() {
  const { state, view } = useDemo();
  return (
    <div className="laptop" style={{ left: 300, top: 40 }}>
      <div className="laptop__screen">
        <div className="laptop__wall" />
        <div className="win">
          <div className="win__bar">
            <span />
            <span />
            <span />
            <em>Weekly sync</em>
          </div>
          <div className="win__body">
            <div className="win__people">
              {["#6aa7ff", "#73db9e", "#ffc75c", "#c49bff"].map((c, i) => (
                <div key={c} className="win__person" style={{ ["--c" as string]: c }}>
                  <span />
                  {i === 1 && <i className="win__talk" />}
                </div>
              ))}
            </div>
            <div className="win__wave" aria-hidden>
              {Array.from({ length: 28 }, (_, i) => (
                <span key={i} style={{ animationDelay: `${(i % 7) * -0.13}s`, height: `${30 + ((i * 37) % 60)}%` }} />
              ))}
            </div>
          </div>
        </div>
        <div className="laptop__dock-wrap">
          <Dock size="screen" />
          <div className="laptop__dock-tail" />
        </div>
        <div className="taskbar">
          <div className="taskbar__apps">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className={i === 0 ? "is-start" : ""} />
            ))}
          </div>
          <div className="taskbar__tray">
            <span className={`taskbar__bb ${state.buds === "on" ? "is-on" : ""}`}>
              <LogoMark size={14} />
            </span>
            <span className="taskbar__clock">10:42</span>
          </div>
        </div>
      </div>
      <div className="laptop__base">
        <span />
      </div>
      <div className="dev-label" style={{ top: 384 }}>
        <strong>This laptop</strong>
        <span>{view.laptopCaption}</span>
      </div>
    </div>
  );
}

function Buds() {
  const { view } = useDemo();
  const level = view.sources;
  return (
    <div className={`buds buds--${level}`} style={{ left: 940, top: 150 }}>
      <div className="buds__rings" aria-hidden>
        <span />
        <span />
        <span />
      </div>
      <svg className="buds__art" viewBox="0 0 160 170" aria-hidden>
        <defs>
          <linearGradient id="bud-shell" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#ffffff" />
            <stop offset="1" stopColor="#c9d1de" />
          </linearGradient>
        </defs>
        <g transform="translate(28 22) rotate(-12)">
          <ellipse cx="26" cy="30" rx="26" ry="28" fill="url(#bud-shell)" />
          <rect x="16" y="44" width="20" height="78" rx="10" fill="url(#bud-shell)" />
          <ellipse cx="20" cy="24" rx="9" ry="8" fill="#1b2130" opacity="0.85" />
          <rect x="20" y="104" width="12" height="10" rx="4" fill="#aab3c2" />
        </g>
        <g transform="translate(98 34) rotate(12)">
          <ellipse cx="26" cy="30" rx="26" ry="28" fill="url(#bud-shell)" />
          <rect x="16" y="44" width="20" height="78" rx="10" fill="url(#bud-shell)" />
          <ellipse cx="32" cy="24" rx="9" ry="8" fill="#1b2130" opacity="0.85" />
          <rect x="20" y="104" width="12" height="10" rx="4" fill="#aab3c2" />
        </g>
      </svg>
      <div className="buds__badge">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.b
            key={level}
            initial={{ y: "80%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-80%", opacity: 0 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          >
            {level}
          </motion.b>
        </AnimatePresence>
        <span>{level === 1 ? "source" : "sources"}</span>
      </div>
      <div className="dev-label" style={{ top: 214 }}>
        <strong>Your buds</strong>
        <span>{view.budsCaption}</span>
      </div>
    </div>
  );
}

export function Scene() {
  const { view, state, watch } = useDemo();
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(Math.min(e.contentRect.width / W, 1.12)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="scene" ref={(el) => {
      box.current = el;
      watch(el);
    }} style={{ height: H * scale }}>
      <div
        className="scene__canvas"
        style={{ width: W, height: H, left: `calc(50% - ${(W * scale) / 2}px)`, transform: `scale(${scale})` }}
      >
        <svg className="scene__lines" viewBox={`0 0 ${W} ${H}`} width={W} height={H} aria-hidden>
          <defs>
            <linearGradient id="back-grad" x1="1" y1="0" x2="0" y2="0">
              <stop offset="0" stopColor="#80b8ff" />
              <stop offset="1" stopColor="#73db9e" />
            </linearGradient>
          </defs>
          <Beam d={PATH_PHONE} link={view.phoneLink} color="green" id="beam-phone" />
          <Beam d={PATH_BUDS} link={view.budsLink} color="blue" id="beam-buds" />
          <AnimatePresence>
            {view.handedBack && (
              <motion.path
                key="back"
                d={PATH_BACK}
                className="beam-back"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                exit={{ pathLength: 0, opacity: 0 }}
                transition={{ duration: 0.9, ease: [0.65, 0, 0.35, 1] }}
              />
            )}
          </AnimatePresence>
        </svg>

        <AnimatePresence>
          {view.handedBack && (
            <motion.div
              className="back-note"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.4, delay: 0.35 }}
            >
              Buds free: your phone can take them
            </motion.div>
          )}
        </AnimatePresence>

        <PhoneDevice />
        <div className="dev-label" style={{ left: 24, top: 446, width: 160 }}>
          <strong>Your phone</strong>
          <span>{view.phoneCaption}</span>
        </div>
        <LaptopDevice />
        <Buds />
      </div>
      <span className="sr-only" aria-live="polite">
        {view.headline}. {state.buds === "on" ? `${view.sources} sources in your buds.` : ""}
      </span>
    </div>
  );
}
