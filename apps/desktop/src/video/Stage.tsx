// The video's stage: a Windows 11 style desktop and taskbar, the real dock in
// a flyout with a Mica-like backdrop, and the pointer, rings, key badges,
// subtitles and end card drawn over it. Everything is a function of the
// director's snapshot, so any frame can be drawn on demand.

import trayConnected from "../../src-tauri/icons/tray-connected.png";
import trayIdle from "../../src-tauri/icons/tray-idle.png";
import appIcon from "../../src-tauri/icons/128x128@2x.png";
import { Dock } from "../components/dock/Dock";
import type { Snapshot } from "./director";
import { stageStore } from "./mockApi";

const OPEN_SECONDS = 0.32;
const REPO = "github.com/shakaibarsalan/BudsBridge";

function clamp(value: number): number {
  return Math.min(Math.max(value, 0), 1);
}

/** Windows' flyout curve: fast out, long settle. */
function decelerate(p: number): number {
  return 1 - (1 - clamp(p)) ** 3;
}

function fade(t: number, from: number, until: number, length = 0.2): number {
  return clamp(Math.min((t - from) / length, (until - t) / length));
}

/** Words between asterisks are highlighted. */
function Highlighted({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*[^*]+\*)/).map((part, i) =>
        part.startsWith("*") ? (
          <em key={i}>{part.slice(1, -1)}</em>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

function Taskbar() {
  const connected = stageStore.devices().some((device) => device.state === "connected");
  return (
    <div className="taskbar">
      <div className="taskbar__apps" aria-hidden="true">
        <span className="app app--search">
          <svg viewBox="0 0 24 24">
            <circle cx="10.5" cy="10.5" r="6" />
            <path d="M15 15l5 5" />
          </svg>
        </span>
        <span className="app app--files">
          <svg viewBox="0 0 24 24">
            <path d="M3 7.5a2 2 0 0 1 2-2h4.2l2 2H19a2 2 0 0 1 2 2V17a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          </svg>
        </span>
        <span className="app app--web">
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="8.5" />
            <path d="M3.5 12h17M12 3.5c2.6 2.4 3.8 5.2 3.8 8.5s-1.2 6.1-3.8 8.5c-2.6-2.4-3.8-5.2-3.8-8.5S9.4 5.9 12 3.5z" />
          </svg>
        </span>
        <span className="app app--terminal">
          <svg viewBox="0 0 24 24">
            <rect x="3" y="5" width="18" height="14" rx="2.5" />
            <path d="M7 10l3 2.5L7 15M12.5 15.5h4" />
          </svg>
        </span>
        <span className="app app--music">
          <svg viewBox="0 0 24 24">
            <path d="M9 17.5V6.5l10-2v11" />
            <circle cx="6.8" cy="17.5" r="2.4" />
            <circle cx="16.8" cy="15.5" r="2.4" />
          </svg>
        </span>
      </div>
      <div className="tray">
        <svg className="tray__glyph" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7 14l5-5 5 5" />
        </svg>
        <img className="tray-app" src={connected ? trayConnected : trayIdle} alt="BudsBridge" />
        <svg className="tray__glyph" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3.5 9.5a12 12 0 0 1 17 0M6.5 12.8a7.6 7.6 0 0 1 11 0M9.6 16a3.2 3.2 0 0 1 4.8 0" />
        </svg>
        <svg className="tray__glyph" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
          <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.8a8 8 0 0 1 0 10.4" />
        </svg>
        <svg className="tray__glyph" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3" y="7.5" width="16" height="9" rx="2" />
          <rect x="5" y="9.5" width="9" height="5" rx="1" className="tray__battery" />
          <path d="M21 10.5v3" />
        </svg>
        <div className="clock">
          <span>10:24 AM</span>
          <span>10/21/2026</span>
        </div>
      </div>
    </div>
  );
}

function Cursor({ x, y }: { x: number; y: number }) {
  return (
    <svg className="cursor" style={{ left: x, top: y }} viewBox="0 0 20 28" aria-hidden="true">
      <path d="M1.5 1.5v20.2l5.1-4.9 3.7 8.3 3.4-1.5-3.6-8.1h7.2z" />
    </svg>
  );
}

export function Stage({ snapshot }: { snapshot: Snapshot }) {
  const { t, cursor, dock } = snapshot;
  const opening = decelerate((t - dock.since) / OPEN_SECONDS);
  const shown = dock.open ? opening : 1 - opening;
  const end = snapshot.end === null ? 0 : clamp((t - snapshot.end) / 0.5);

  // The opening headline, until the dock opens.
  const headline = dock.open
    ? 1 - clamp((t - dock.since) / 0.3)
    : clamp((t - 0.2) / 0.5);

  return (
    <div className="stage">
      <div className="screen">
      <div className="wallpaper" />

      {headline > 0 && (
        <div className="headline" style={{ opacity: headline }}>
          <span className="headline__kicker">One pair of earbuds</span>
          <span className="headline__big">
            Phone <em>or</em> laptop.
          </span>
          <span className="headline__big">Never both.</span>
        </div>
      )}

      <div
        className="flyout"
        style={{
          opacity: shown,
          transform: `translateY(${(1 - shown) * 28}px)`,
          visibility: shown > 0.001 ? "visible" : "hidden",
        }}
      >
        <Dock />
      </div>

      <Taskbar />

      {snapshot.rings.map((ring) => {
        if (t < ring.from || t >= ring.until) return null;
        const pulse = (1 - Math.cos(((t - ring.from) / 0.9) * 2 * Math.PI)) / 2;
        const pad = 6 + 3 * pulse;
        return (
          <div
            key={ring.from}
            className="ring"
            style={{
              left: ring.box.x - pad,
              top: ring.box.y - pad,
              width: ring.box.w + pad * 2,
              height: ring.box.h + pad * 2,
              opacity: fade(t, ring.from, ring.until) * (1 - 0.55 * pulse),
            }}
          />
        );
      })}

      {snapshot.clicks.map((click) => {
        const age = t - click.at;
        if (age < 0 || age > 0.45) return null;
        const size = 12 + 44 * (age / 0.45);
        return (
          <div
            key={click.at}
            className="ripple"
            style={{
              left: click.x - size / 2,
              top: click.y - size / 2,
              width: size,
              height: size,
              opacity: 1 - age / 0.45,
            }}
          />
        );
      })}

      {snapshot.keys && t >= snapshot.keys.from && t < snapshot.keys.until && (
        <div className="keys" style={{ opacity: fade(t, snapshot.keys.from, snapshot.keys.until, 0.15) }}>
          {snapshot.keys.labels.map((label, i) => (
            <span key={label} className="keys__group">
              {i > 0 && <span className="keys__plus">+</span>}
              <kbd>{label}</kbd>
            </span>
          ))}
        </div>
      )}

      {end > 0 && (
        <div className="endcard" style={{ opacity: end }}>
          <div className="endcard__card" style={{ transform: `translateY(${(1 - end) * 16}px)` }}>
            <img src={appIcon} alt="" width="84" height="84" />
            <h1>BudsBridge</h1>
            <p>Your phone and your laptop, in the same earbuds.</p>
            <p className="endcard__meta">Free and open source · Windows 10 and 11</p>
            <span className="endcard__link">{REPO}</span>
          </div>
        </div>
      )}

      <Cursor x={cursor.x} y={cursor.y} />
      </div>

      <div className="strip">
        {snapshot.caption && (
          <p
            className="caption"
            style={{ opacity: fade(t, snapshot.caption.from, snapshot.caption.until, 0.18) }}
          >
            <Highlighted text={snapshot.caption.text} />
          </p>
        )}
      </div>
    </div>
  );
}
