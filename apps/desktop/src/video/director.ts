// Turns the scenario into a timeline and answers "what is on screen at t?".
// Time only moves forward (the renderer steps frame by frame), so actions
// run once, in order, the first time `seek` passes them.

export interface Line {
  id: string;
  /** The subtitle; may differ from what is spoken. */
  text: string;
  /** Seconds of speech. */
  dur: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Box extends Point {
  w: number;
  h: number;
}

/** Something on screen to point at: a CSS selector, a finder, or a point. */
export type Target = string | (() => Element | null | undefined) | Point;

export type Action =
  | { at: number; kind: "move"; to: Target; dur: number; dx?: number; dy?: number }
  | { at: number; kind: "click" }
  | { at: number; kind: "ring"; target: Target; dur: number }
  | { at: number; kind: "keys"; labels: string[]; dur: number }
  | { at: number; kind: "dock"; open: boolean }
  | { at: number; kind: "end" }
  | { at: number; kind: "do"; run: () => void };

export interface Step {
  id: string;
  actions: Action[];
}

export interface Snapshot {
  t: number;
  cursor: Point;
  clicks: { at: number; x: number; y: number }[];
  rings: { from: number; until: number; box: Box }[];
  keys: { from: number; until: number; labels: string[] } | null;
  dock: { open: boolean; since: number };
  end: number | null;
  caption: { text: string; from: number; until: number } | null;
}

/** Gap between one line ending and the next step. */
const BREATH = 0.45;
const LINE_DELAY = 0.15;
const ACTION_DELAY = 0.25;
const END_HOLD = 1.6;

interface Timed {
  action: Action;
  at: number;
}

interface Placed {
  id: string;
  text: string;
  start: number;
  end: number;
}

function ease(p: number): number {
  const c = Math.min(Math.max(p, 0), 1);
  return c < 0.5 ? 4 * c ** 3 : 1 - (-2 * c + 2) ** 3 / 2;
}

function resolve(target: Target): Box | null {
  if (typeof target === "object" && "x" in target) return { ...target, w: 0, h: 0 };
  const element = typeof target === "string" ? document.querySelector(target) : target();
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return { x: rect.left, y: rect.top, w: rect.width, h: rect.height };
}

export class Director {
  private timeline: Timed[] = [];
  private lines: Placed[] = [];
  private next = 0;
  private duration = 0;
  private cursor: Point;
  private move: { from: Point; to: Point; at: number; dur: number } | null = null;
  private state: Omit<Snapshot, "t" | "cursor" | "caption">;

  constructor(
    private readonly steps: Step[],
    start: Point,
  ) {
    this.cursor = start;
    this.state = { clicks: [], rings: [], keys: null, dock: { open: false, since: -10 }, end: null };
  }

  /** Lays the steps out on the clock: each starts once the previous line is spoken. */
  plan(lines: Line[]): { duration: number; lines: Placed[] } {
    let t = 0;
    let lineEnd = -BREATH;
    for (const step of this.steps) {
      const line = lines.find((candidate) => candidate.id === step.id);
      const start = Math.max(t, lineEnd + BREATH);
      if (line) {
        const spoken = start + LINE_DELAY;
        lineEnd = spoken + line.dur;
        this.lines.push({ id: line.id, text: line.text, start: spoken, end: lineEnd });
      }
      let last = start;
      for (const action of step.actions) {
        const at = start + ACTION_DELAY + action.at;
        this.timeline.push({ action, at });
        const length = "dur" in action ? action.dur : 0;
        last = Math.max(last, at + length);
      }
      t = last;
    }
    this.timeline.sort((a, b) => a.at - b.at);
    this.duration = Math.max(t, lineEnd) + END_HOLD;
    return { duration: this.duration, lines: this.lines };
  }

  seek(t: number): Snapshot {
    while (this.next < this.timeline.length && this.timeline[this.next]!.at <= t) {
      const { action, at } = this.timeline[this.next]!;
      this.next += 1;
      this.run(action, at);
    }
    return {
      t,
      cursor: this.cursorAt(t),
      ...this.state,
      caption: this.captionAt(t),
    };
  }

  private run(action: Action, at: number) {
    switch (action.kind) {
      case "move": {
        const box = resolve(action.to);
        if (!box) throw new Error(`nothing to move to for ${String(action.to)}`);
        const to = {
          x: box.x + box.w * (action.dx ?? 0.5),
          y: box.y + box.h * (action.dy ?? 0.5),
        };
        this.move = { from: this.cursorAt(at), to, at, dur: action.dur };
        break;
      }
      case "click":
        this.state.clicks = [...this.state.clicks, { at, ...this.cursorAt(at) }];
        break;
      case "ring": {
        const box = resolve(action.target);
        if (box) this.state.rings = [...this.state.rings, { from: at, until: at + action.dur, box }];
        break;
      }
      case "keys":
        this.state.keys = { from: at, until: at + action.dur, labels: action.labels };
        break;
      case "dock":
        this.state.dock = { open: action.open, since: at };
        break;
      case "end":
        this.state.end = at;
        break;
      case "do":
        action.run();
        break;
    }
  }

  private cursorAt(t: number): Point {
    if (!this.move) return this.cursor;
    const { from, to, at, dur } = this.move;
    const p = ease((t - at) / dur);
    const point = { x: from.x + (to.x - from.x) * p, y: from.y + (to.y - from.y) * p };
    if (t >= at + dur) {
      this.cursor = to;
      this.move = null;
    }
    return point;
  }

  private captionAt(t: number): Snapshot["caption"] {
    for (const [i, line] of this.lines.entries()) {
      const following = this.lines[i + 1]?.start ?? this.duration;
      const until = Math.min(line.end + 0.7, following - 0.1);
      if (t >= line.start - 0.05 && t < until) return { text: line.text, from: line.start, until };
    }
    return null;
  }
}
