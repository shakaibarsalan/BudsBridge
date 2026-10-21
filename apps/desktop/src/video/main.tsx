// Entry of the video stage (video.html). The renderer drives it frame by
// frame through `window.stage`: `load` lays out the timeline from the spoken
// lines, `seek(t)` draws the frame at t seconds.

import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";

import "../styles.css";
import "./stage.css";
import { Director, type Line } from "./director";
import { STEPS, setUp } from "./scenario";
import { Stage } from "./Stage";

const element = document.getElementById("root");
if (!element) throw new Error("missing #root element");
const root = createRoot(element);
const director = new Director(STEPS, { x: 250, y: 420 });

/** When each animation was first seen, so it starts from its beginning then. */
const born = new WeakMap<Animation, number>();

/** Puts every CSS and SVG animation at its state for time t, instead of the wall clock. */
function syncAnimations(t: number) {
  for (const animation of document.getAnimations()) {
    if (!born.has(animation)) born.set(animation, t);
    animation.pause();
    animation.currentTime = (t - (born.get(animation) ?? t)) * 1000;
  }
  for (const svg of document.querySelectorAll("svg")) {
    svg.pauseAnimations();
    svg.setCurrentTime(t);
  }
}

function draw(t: number) {
  flushSync(() => {
    const snapshot = director.seek(t);
    root.render(<Stage snapshot={snapshot} />);
  });
  syncAnimations(t);
}

declare global {
  interface Window {
    stage: {
      load: (lines: Line[]) => Promise<ReturnType<Director["plan"]>>;
      seek: (t: number) => void;
    };
  }
}

window.stage = {
  async load(lines) {
    setUp();
    draw(0);
    // Let the dock load its first lists from the mock API.
    await new Promise((resolve) => setTimeout(resolve, 300));
    const plan = director.plan(lines);
    draw(0);
    return plan;
  },
  seek: draw,
};
