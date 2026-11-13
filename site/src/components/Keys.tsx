import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useOs } from "../lib/platform";

/** Ctrl + Alt + B keycaps (⌃ ⌥ B on a Mac) that press down each time `pulse` changes. */
export function HotkeyKeys({ pulse, onPress, label = "Press the hotkey" }: { pulse: number; onPress?: () => void; label?: string }) {
  const [down, setDown] = useState(false);
  useEffect(() => {
    if (pulse === 0) return;
    setDown(true);
    const t = setTimeout(() => setDown(false), 260);
    return () => clearTimeout(t);
  }, [pulse]);

  const mac = useOs() === "mac";
  const keys = mac ? ["⌃", "⌥", "B"] : ["Ctrl", "Alt", "B"];
  const Tag = onPress ? motion.button : motion.span;
  return (
    <Tag
      className={`keys ${down ? "is-down" : ""}`}
      {...(onPress ? { onClick: onPress, type: "button", "aria-label": label } : { "aria-hidden": true })}
      whileTap={onPress ? { scale: 0.97 } : undefined}
    >
      {keys.map((k, i) => (
        <span key={k} className="keys__group">
          <kbd className="keycap" title={mac ? ["Control", "Option", "B"][i] : undefined} style={{ transitionDelay: down ? `${i * 30}ms` : "0ms" }}>
            {k}
          </kbd>
          {i < keys.length - 1 && <span className="keys__plus">+</span>}
        </span>
      ))}
    </Tag>
  );
}
