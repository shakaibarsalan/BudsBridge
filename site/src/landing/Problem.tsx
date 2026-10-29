import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { IconCheck, IconHeadphones, IconPhone, IconRefresh } from "../components/Icons";
import { Reveal } from "../components/Reveal";
import { REPO_URL } from "../lib/release";
import { useMedia } from "../lib/useMedia";

const STAGES = [
  {
    kicker: "The problem",
    title: "Most cheap buds hold one connection.",
    body: "They talk to one device at a time. Talking to two is called multipoint, and it lives in the buds' firmware. No app on Windows or Android can add it.",
  },
  {
    kicker: "So every switch is a chore",
    title: "Settings, disconnect, settings, connect.",
    body: "Phone to laptop means opening Bluetooth on the phone, disconnecting, then connecting again on the laptop. Every single time.",
  },
  {
    kicker: "What BudsBridge does",
    title: "Your buds never leave the laptop.",
    body: "Your phone connects to the laptop as if it were a speaker, and Windows mixes the phone's sound with the laptop's into your buds. Nothing switches.",
  },
];

const SWITCH_STEPS = ["Phone: open Bluetooth", "Disconnect the buds", "Laptop: open Bluetooth", "Connect the buds"];

function Node({ x, y, label, icon, lit, tone }: { x: number; y: number; label: string; icon: ReactNode; lit: boolean; tone: "blue" | "green" | "grey" }) {
  return (
    <g transform={`translate(${x} ${y})`} className={`pnode pnode--${tone} ${lit ? "is-lit" : ""}`}>
      <rect x="-38" y="-38" width="76" height="76" rx="22" className="pnode__box" />
      <foreignObject x="-16" y="-16" width="32" height="32">
        <div className="pnode__icon">{icon}</div>
      </foreignObject>
      <text y="66" textAnchor="middle" className="pnode__label">
        {label}
      </text>
    </g>
  );
}

function LaptopGlyph() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden>
      <rect x="4" y="5" width="16" height="11" rx="1.5" />
      <path d="M2.5 19h19" />
    </svg>
  );
}

/** One picture that changes with the stage: buds on the phone, the switching dance, then the bridge. */
function Picture({ stage }: { stage: number }) {
  // Stage 1 loops the switch between phone and laptop.
  const [flip, setFlip] = useState(false);
  useEffect(() => {
    if (stage !== 1) return;
    const t = setInterval(() => setFlip((f) => !f), 1500);
    return () => clearInterval(t);
  }, [stage]);

  const phoneToBuds = stage === 0 || (stage === 1 && !flip);
  const laptopToBuds = stage === 1 && flip;
  const bridge = stage === 2;

  return (
    <div className="ppic">
      <svg viewBox="0 0 600 360" className="ppic__svg" aria-hidden>
        {/* phone straight to buds, the arc over the top */}
        <motion.path
          d="M110 150 C 200 20, 400 20, 490 150"
          className="pline pline--green"
          animate={{ pathLength: phoneToBuds ? 1 : 0, opacity: phoneToBuds ? 1 : 0 }}
          transition={{ duration: 0.6, ease: [0.65, 0, 0.35, 1] }}
        />
        {/* laptop to buds */}
        <motion.path
          d="M338 190 L 452 190"
          className="pline pline--blue"
          animate={{ pathLength: laptopToBuds || bridge ? 1 : 0, opacity: laptopToBuds || bridge ? 1 : 0 }}
          transition={{ duration: 0.5, ease: [0.65, 0, 0.35, 1] }}
        />
        {/* phone to laptop, only with the bridge */}
        <motion.path
          d="M148 190 L 262 190"
          className="pline pline--green"
          animate={{ pathLength: bridge ? 1 : 0, opacity: bridge ? 1 : 0 }}
          transition={{ duration: 0.5, delay: bridge ? 0.15 : 0, ease: [0.65, 0, 0.35, 1] }}
        />
        {/* the idle line the buds can't hold */}
        <motion.path
          d="M338 190 L 452 190"
          className="pline pline--idle"
          animate={{ opacity: stage === 0 ? 1 : 0 }}
        />
        {stage === 0 && (
          <g className="pcross" transform="translate(395 190)">
            <circle r="13" />
            <path d="M-5 -5 L5 5 M5 -5 L-5 5" />
          </g>
        )}
        <Node x={110} y={190} label="Phone" icon={<IconPhone />} lit={phoneToBuds || bridge} tone="green" />
        <Node x={300} y={190} label="Laptop" icon={<LaptopGlyph />} lit={laptopToBuds || bridge} tone={stage === 0 ? "grey" : "blue"} />
        <Node x={490} y={190} label="Buds" icon={<IconHeadphones />} lit tone="blue" />
      </svg>

      <AnimatePresence mode="wait">
        {stage === 1 && (
          <motion.ol
            key="steps"
            className="psteps"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            {SWITCH_STEPS.map((s, i) => (
              <motion.li
                key={s}
                initial={{ opacity: 0.35 }}
                animate={{ opacity: [0.35, 1, 1, 0.35] }}
                transition={{ duration: 3, delay: i * 0.6, repeat: Infinity, times: [0, 0.15, 0.7, 1] }}
              >
                <IconCheck />
                {s}
              </motion.li>
            ))}
            <li className="psteps__again">
              <IconRefresh /> and again tomorrow
            </li>
          </motion.ol>
        )}
        {stage === 2 && (
          <motion.div
            key="sources"
            className="psources"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ delay: 0.3 }}
          >
            <b>2</b> sources in your buds <em>phone + laptop</em>
          </motion.div>
        )}
        {stage === 0 && (
          <motion.div
            key="one"
            className="psources psources--muted"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
          >
            <b>1</b> device at a time
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function StageText({ i }: { i: number }) {
  const s = STAGES[i];
  return (
    <>
      <span className="eyebrow">
        <span className="eyebrow__dot" style={i === 2 ? { background: "var(--green)", boxShadow: "0 0 12px var(--green)" } : undefined} />
        {s.kicker}
      </span>
      <h2 className="h-section problem__title">{s.title}</h2>
      <p className="lede">{s.body}</p>
      {i === 0 && (
        <a className="text-link" href={`${REPO_URL}/blob/main/docs/FEASIBILITY.md#1-why-the-problem-exists`} target="_blank" rel="noreferrer">
          Why, with sources →
        </a>
      )}
    </>
  );
}

export function Problem() {
  const wide = useMedia("(min-width: 960px)", true);
  const ref = useRef<HTMLElement>(null);
  const [stage, setStage] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  useMotionValueEvent(scrollYProgress, "change", (v) => setStage(v < 0.34 ? 0 : v < 0.68 ? 1 : 2));

  if (!wide) {
    return (
      <section className="section problem problem--stacked" id="problem">
        <div className="container">
          {STAGES.map((_, i) => (
            <Reveal key={i} className="problem__block">
              <div className="problem__copy">
                <StageText i={i} />
              </div>
              <Picture stage={i} />
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className="problem" id="problem" ref={ref}>
      <div className="problem__sticky">
        <div className="container problem__grid">
          <div className="problem__copy">
            <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                className="problem__copy-inner"
                initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -24, filter: "blur(8px)" }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <StageText i={stage} />
              </motion.div>
            </AnimatePresence>
            <div className="problem__dots" aria-hidden>
              {STAGES.map((_, i) => (
                <span key={i} className={i === stage ? "is-on" : ""} />
              ))}
            </div>
          </div>
          <Picture stage={stage} />
        </div>
      </div>
    </section>
  );
}
