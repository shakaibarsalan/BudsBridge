import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { IconCheck } from "../components/Icons";
import { LogoMark } from "../components/Logo";

// A re-drawn first open on macOS 15 and later: Done on the warning, Open Anyway in
// Privacy & Security, confirm, then Allow Bluetooth.
// Stage 0: warning, 1: cursor on Done, 2: Privacy & Security, 3: cursor on Open Anyway,
// 4: confirm, 5: Bluetooth prompt, 6: cursor on Allow, 7: in the menu bar.
const WAITS = [1400, 900, 1300, 900, 1300, 1100, 900, 2400];
const HOVER: Record<number, "done" | "open" | "allow"> = { 1: "done", 3: "open", 6: "allow" };

function Fingerprint() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden>
      <path d="M6.5 6.2A8 8 0 0 1 20 12v1" />
      <path d="M4 12a8 8 0 0 1 1-3.9" />
      <path d="M8 12a4 4 0 0 1 8 0v1.5c0 2-.4 4-1.2 5.8" />
      <path d="M12 12v2c0 2.6-.7 5-2 7" />
      <path d="M4.5 16c.4-1 .5-2 .5-3" />
      <path d="M8 15.5c0 2-.6 3.8-1.6 5.3" />
    </svg>
  );
}

export function MacFirstOpen() {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { amount: 0.5 });
  const [stage, setStage] = useState(0);
  const targets = { done: useRef<HTMLSpanElement>(null), open: useRef<HTMLSpanElement>(null), allow: useRef<HTMLSpanElement>(null) };
  const [cursor, setCursor] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => setStage((s) => (s + 1) % WAITS.length), WAITS[stage]);
    return () => clearTimeout(t);
  }, [on, stage]);

  // The cursor goes to the middle of whatever button this stage clicks, wherever the layout put it.
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box) return;
    const a = box.getBoundingClientRect();
    const target = HOVER[stage] && targets[HOVER[stage]].current;
    if (!target) {
      // parked just below the picture
      setCursor({ left: a.width / 2, top: a.height + 20 });
      return;
    }
    const b = target.getBoundingClientRect();
    setCursor({ left: b.left - a.left + b.width * 0.55, top: b.top - a.top + b.height * 0.45 });
  }, [stage]);

  const settings = stage >= 2 && stage <= 4;
  const bluetooth = stage === 5 || stage === 6;

  return (
    <div
      ref={ref}
      className="mac"
      role="img"
      aria-label="macOS 15 and later: click Done, open System Settings, Privacy & Security, click Open Anyway, confirm, then allow Bluetooth"
    >
      <div className="mac__menubar" aria-hidden>
        <span className="mac__menubar-apps">
          <i />
          <i />
          <i />
        </span>
        <span className="mac__menubar-end">
          <motion.span
            className="mac__menubar-bb"
            animate={{ opacity: stage === 7 ? 1 : 0, scale: stage === 7 ? 1 : 0.6 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <LogoMark size={14} />
          </motion.span>
          <i />
          <i />
          <span>10:42</span>
        </span>
      </div>

      <div className="mac__stage">
        <AnimatePresence mode="wait">
          {stage <= 1 && (
            <motion.div key="warn" className="mac__alert" {...pop}>
              <span className="mac__alert-icon">
                <LogoMark size={44} />
              </span>
              <b>“BudsBridge” Not Opened</b>
              <p>Apple could not verify “BudsBridge” is free of malware that may harm your Mac or compromise your privacy.</p>
              <div className="mac__alert-buttons mac__alert-buttons--stack">
                <span ref={targets.done} className={`mac__btn mac__btn--primary ${stage === 1 ? "is-hover" : ""}`}>
                  Done
                </span>
                <span className="mac__btn">Move to Trash</span>
              </div>
            </motion.div>
          )}

          {settings && (
            <motion.div key="settings" className="mac__win" {...pop}>
              <div className="mac__win-bar">
                <i />
                <i />
                <i />
              </div>
              <div className="mac__win-body">
                <div className="mac__side" aria-hidden>
                  <span>Wi-Fi</span>
                  <span>Bluetooth</span>
                  <span>General</span>
                  <span className="is-on">Privacy &amp; Security</span>
                </div>
                <div className="mac__pane">
                  <div className="mac__pane-title">Privacy &amp; Security</div>
                  <div className="mac__group mac__group--faint" aria-hidden>
                    <i />
                    <i />
                  </div>
                  <div className="mac__pane-label">Security</div>
                  <div className="mac__group">
                    <div className="mac__row">
                      <span>“BudsBridge” was blocked to protect your Mac.</span>
                      <span ref={targets.open} className={`mac__btn mac__btn--small ${stage === 3 ? "is-hover" : ""}`}>
                        Open Anyway
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <AnimatePresence>
                {stage === 4 && (
                  <motion.div
                    className="mac__sheet"
                    initial={{ opacity: 0, y: -12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <span className="mac__touch">
                      <Fingerprint />
                    </span>
                    <span>Touch ID or your password</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {bluetooth && (
            <motion.div key="bt" className="mac__alert" {...pop}>
              <span className="mac__alert-icon">
                <LogoMark size={44} />
              </span>
              <b>“BudsBridge” would like to use Bluetooth.</b>
              <div className="mac__alert-buttons">
                <span className="mac__btn">Don't Allow</span>
                <span ref={targets.allow} className={`mac__btn mac__btn--primary ${stage === 6 ? "is-hover" : ""}`}>
                  Allow
                </span>
              </div>
            </motion.div>
          )}

          {stage === 7 && (
            <motion.div key="ok" className="ss__ok" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <IconCheck />
              BudsBridge is in the menu bar
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {stage < 7 && cursor && (
        <motion.span className="ss__cursor" initial={false} animate={cursor} transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }} aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M5 3l14 8-6.5 1.5L10 19z" fill="#fff" stroke="#000" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </motion.span>
      )}
    </div>
  );
}

const pop = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.96 },
  transition: { duration: 0.3 },
};
