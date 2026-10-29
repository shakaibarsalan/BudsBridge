import { AnimatePresence, motion, useInView } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { IconShield } from "../components/Icons";

// A re-drawn SmartScreen prompt that shows the two clicks: More info, then Run anyway.
// Stage 0: first screen, 1: cursor on More info, 2: details shown, 3: cursor on Run anyway, 4: app opens.
export function SmartScreen({ file }: { file: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const on = useInView(ref, { amount: 0.5 });
  const [stage, setStage] = useState(0);

  useEffect(() => {
    if (!on) return;
    const waits = [1300, 900, 1300, 900, 2200];
    const t = setTimeout(() => setStage((s) => (s + 1) % 5), waits[stage]);
    return () => clearTimeout(t);
  }, [on, stage]);

  const details = stage >= 2;
  const cursor = stage === 1 ? { left: "12%", top: details ? "60%" : "58%" } : stage === 3 ? { left: "64%", top: "88%" } : { left: "46%", top: "110%" };

  return (
    <div ref={ref} className="ss" aria-label="Windows SmartScreen: click More info, then Run anyway" role="img">
      <AnimatePresence mode="wait">
        {stage < 4 ? (
          <motion.div
            key="dialog"
            className="ss__dialog"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.3 }}
          >
            <div className="ss__close" aria-hidden>
              ×
            </div>
            <div className="ss__title">Windows protected your PC</div>
            <p className="ss__text">
              Microsoft Defender SmartScreen prevented an unrecognized app from starting. Running this app might put your PC at
              risk.
            </p>
            {!details ? (
              <span className={`ss__more ${stage === 1 ? "is-hover" : ""}`}>More info</span>
            ) : (
              <div className="ss__details">
                <div>
                  <span>App:</span> {file}
                </div>
                <div>
                  <span>Publisher:</span> Unknown publisher
                </div>
              </div>
            )}
            <div className="ss__buttons">
              {details && <span className={`ss__btn ${stage === 3 ? "is-hover" : ""}`}>Run anyway</span>}
              <span className="ss__btn ss__btn--primary">Don't run</span>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="ok"
            className="ss__ok"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <IconShield />
            BudsBridge opens in the tray
          </motion.div>
        )}
      </AnimatePresence>
      {stage < 4 && (
        <motion.span
          className="ss__cursor"
          animate={cursor}
          transition={{ duration: 0.7, ease: [0.65, 0, 0.35, 1] }}
          aria-hidden
        >
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M5 3l14 8-6.5 1.5L10 19z" fill="#fff" stroke="#000" strokeWidth="1.3" strokeLinejoin="round" />
          </svg>
        </motion.span>
      )}
    </div>
  );
}
