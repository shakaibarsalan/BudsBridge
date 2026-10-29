import Lenis from "lenis";

/** Smooth wheel scrolling, skipped for people who asked for less motion. Anchor links glide too. */
export function startSmoothScroll() {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const lenis = new Lenis({ duration: 1.1, smoothWheel: true, anchors: { offset: -84 } });
  const raf = (t: number) => {
    lenis.raf(t);
    requestAnimationFrame(raf);
  };
  requestAnimationFrame(raf);
}
