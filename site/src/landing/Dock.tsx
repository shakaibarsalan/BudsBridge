import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import { IconChevron, IconDots, IconGear, IconHeadphones, IconKeyboard, IconPhone, IconPower, IconRefresh } from "../components/Icons";
import { useDemo } from "../lib/demo";

type Tone = "accent" | "phone" | "busy" | "muted" | "plain";

function Tile({
  icon,
  label,
  value,
  sub,
  tone,
  active,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  sub: string;
  tone: Tone;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button className={`dtile dtile--${tone} ${active ? "is-active" : ""}`} onClick={onClick} type="button">
      <span className="dtile__icon">{icon}</span>
      <span className="dtile__text">
        <span className="dtile__label">{label}</span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={value}
            className="dtile__value"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            {value}
          </motion.span>
        </AnimatePresence>
        <span className="dtile__sub">{sub}</span>
      </span>
    </button>
  );
}

/**
 * The tray dock, drawn after the app's own: headline, source count and the four tiles
 * that are also the switches. `size="screen"` is the small copy inside the laptop picture.
 */
export function Dock({ size = "card" }: { size?: "card" | "screen" }) {
  const { state, view, toggleBuds, togglePhone, toggleReconnect, pressHotkey } = useDemo();
  const budsOn = state.buds === "on";

  return (
    <div className={`dock dock--${size}`} role="group" aria-label="BudsBridge dock, try it">
      <div className="dock__top">
        <div>
          <div className="dock__title">BudsBridge</div>
          <div className="dock__subtitle">Demo · {budsOn ? "Demo Buds connected" : "Demo Buds released"}</div>
        </div>
        <div className="dock__tools" aria-hidden>
          <IconGear />
          <IconDots />
        </div>
      </div>

      <div className="dock__panel">
        <div className="dock__hero">
          <div className="dock__status" aria-live="polite">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view.headline}
                initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
                transition={{ duration: 0.28 }}
              >
                <div className="dock__headline">{view.headline}</div>
                <div className="dock__detail">{view.detail}</div>
              </motion.div>
            </AnimatePresence>
          </div>
          <button
            className={`dock__power ${budsOn ? "is-on" : ""} ${state.buds === "connecting" || state.buds === "releasing" ? "is-busy" : ""}`}
            onClick={toggleBuds}
            aria-label={budsOn ? "Release the buds" : "Connect the buds"}
            type="button"
          >
            <IconPower />
          </button>
        </div>

        <div className="dock__sources">
          <span className="dock__count">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={view.sources}
                initial={{ opacity: 0, y: "60%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "-60%" }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                {view.sources}
              </motion.span>
            </AnimatePresence>
          </span>
          <span className="dock__sources-label">
            {view.sources === 1 ? "source" : "sources"} <em>in your buds</em>
          </span>
          <span className="dock__sources-what">{view.sourcesLabel}</span>
        </div>

        <div className="dock__tiles">
          <Tile
            icon={<IconHeadphones />}
            label="Buds"
            value={view.budsTile.value}
            sub="Demo Buds"
            tone={view.budsTile.tone}
            active={budsOn}
            onClick={toggleBuds}
          />
          <Tile
            icon={<IconPhone />}
            label="Phone audio"
            value={view.phoneTile.value}
            sub="Demo Phone"
            tone={view.phoneTile.tone}
            active={state.phone === "playing"}
            onClick={togglePhone}
          />
          <Tile
            icon={<IconKeyboard />}
            label="Hotkey"
            value="Ctrl+Alt+B"
            sub="toggles buds"
            tone="plain"
            onClick={pressHotkey}
          />
          <Tile
            icon={<IconRefresh />}
            label="Reconnect"
            value={state.reconnect ? "On" : "Off"}
            sub="after drops"
            tone={state.reconnect ? "accent" : "muted"}
            active={state.reconnect}
            onClick={toggleReconnect}
          />
        </div>

        <div className="dock__rows">
          <div className="dock__row">
            <span>Devices</span>
            <span>
              3 paired <IconChevron />
            </span>
          </div>
          {size === "card" && (
            <div className="dock__row">
              <span>Phones</span>
              <span>
                2 paired <IconChevron />
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
