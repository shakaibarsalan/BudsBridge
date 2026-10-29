import { motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { IconArrow, IconGitHub } from "../components/Icons";
import { Reveal } from "../components/Reveal";
import { REPO_URL } from "../lib/release";

// The app's connection state machine, the same four states and transitions as in the README.
const NODES = [
  { id: "Disconnected", x: 110, y: 70 },
  { id: "Connecting", x: 390, y: 70 },
  { id: "Connected", x: 390, y: 250 },
  { id: "Disconnecting", x: 110, y: 250 },
] as const;

const EDGES = [
  { from: 0, to: 1, d: "M180 70 H320", label: "click, tray, hotkey", lx: 250, ly: 56 },
  { from: 1, to: 2, d: "M390 96 V224", label: "link is up", lx: 404, ly: 164, anchor: "start" as const },
  { from: 2, to: 3, d: "M320 250 H180", label: "click or hotkey", lx: 250, ly: 274 },
  { from: 3, to: 0, d: "M110 224 V96", label: "link is down", lx: 96, ly: 164, anchor: "end" as const },
];

function StateMachine() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { amount: 0.4 });
  const [at, setAt] = useState(0);
  useEffect(() => {
    if (!on) return;
    const t = setInterval(() => setAt((a) => (a + 1) % 4), 1400);
    return () => clearInterval(t);
  }, [on]);

  return (
    <div ref={ref} className="sm">
      <svg viewBox="0 0 500 320" aria-label="Connection states: Disconnected, Connecting, Connected, Disconnecting" role="img">
        <defs>
          <marker id="sm-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {EDGES.map((e, i) => (
          <g key={i} className={`sm__edge ${i === (at + 3) % 4 ? "is-hot" : ""}`}>
            <path d={e.d} markerEnd="url(#sm-arrow)" />
            <text x={e.lx} y={e.ly} textAnchor={e.anchor ?? "middle"}>
              {e.label}
            </text>
          </g>
        ))}
        {NODES.map((n, i) => (
          <g key={n.id} transform={`translate(${n.x} ${n.y})`} className={`sm__node ${i === at ? "is-on" : ""} sm__node--${i}`}>
            <rect x="-72" y="-26" width="144" height="52" rx="16" />
            <text textAnchor="middle" dy="5">
              {n.id}
            </text>
          </g>
        ))}
        <motion.circle
          r="7"
          className="sm__token"
          animate={{ cx: NODES[at].x + (at === 0 || at === 3 ? -72 : 72), cy: NODES[at].y - 26 }}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
        />
        <text x="250" y="312" textAnchor="middle" className="sm__foot">
          Connecting gives up after 15 s · unexpected drops retry with back-off
        </text>
      </svg>
    </div>
  );
}

const POINTS = [
  { k: "Rust + Tauri 2", v: "A single ~4 MB .exe with a WebView2 window. Windows 11 already has the runtime." },
  { k: "A pure state machine", v: "Commands, device snapshots and time go in, actions come out. Every transition is unit-tested." },
  { k: "Honest notes", v: "Tested on one real setup so far, with two phones at once. Delay hasn't been measured yet." },
];

export function OpenSource() {
  return (
    <section className="section oss" id="open-source">
      <div className="container oss__grid">
        <Reveal className="oss__copy">
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            Open source
          </span>
          <h2 className="h-section">
            Built in the open, <span className="grad-text">MIT licensed.</span>
          </h2>
          <p className="lede">
            Windows has no public “connect this headset” API, so BudsBridge talks to the Bluetooth audio driver the way the
            classic Sound panel does. All of it is on GitHub to read, build and improve.
          </p>
          <dl className="oss__points">
            {POINTS.map((p) => (
              <div key={p.k}>
                <dt>{p.k}</dt>
                <dd>{p.v}</dd>
              </div>
            ))}
          </dl>
          <div className="oss__actions">
            <a href={REPO_URL} className="btn btn--glass" target="_blank" rel="noreferrer">
              <IconGitHub /> Star on GitHub
            </a>
            <a className="text-link" href={`${REPO_URL}/blob/main/docs/FEASIBILITY.md`} target="_blank" rel="noreferrer">
              Read the feasibility study <IconArrow />
            </a>
          </div>
        </Reveal>
        <Reveal delay={0.12} className="oss__visual">
          <StateMachine />
        </Reveal>
      </div>
    </section>
  );
}
