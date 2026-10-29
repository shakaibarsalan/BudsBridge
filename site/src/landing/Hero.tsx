import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { useRef } from "react";
import { DownloadButton } from "../components/DownloadCta";
import { IconArrow, IconGitHub } from "../components/Icons";
import { HotkeyKeys } from "../components/Keys";
import { WordsIn } from "../components/Reveal";
import { useDemo } from "../lib/demo";
import { ago } from "../lib/format";
import { DOWNLOAD_PAGE } from "../lib/links";
import { REPO_URL, useLatestRelease, version } from "../lib/release";
import { Dock } from "./Dock";
import { Scene } from "./Scene";

export function Hero() {
  const { release } = useLatestRelease();
  const { state, pressHotkey } = useDemo();
  const reduce = useReducedMotion();
  const stage = useRef<HTMLDivElement>(null);

  // The picture starts tipped back and lies flat as you scroll into it.
  const { scrollYProgress } = useScroll({ target: stage, offset: ["start end", "start 0.25"] });
  const tilt = useSpring(useTransform(scrollYProgress, [0, 1], [22, 0]), { stiffness: 120, damping: 24 });
  const lift = useSpring(useTransform(scrollYProgress, [0, 1], [0.92, 1]), { stiffness: 120, damping: 24 });

  return (
    <section className="hero" id="top">
      <div className="hero__bg" aria-hidden>
        <div className="hero__grid" />
        <div className="hero__aurora hero__aurora--a" />
        <div className="hero__aurora hero__aurora--b" />
        <div className="hero__aurora hero__aurora--c" />
      </div>

      <div className="container hero__inner">
        <motion.a
          href={DOWNLOAD_PAGE}
          className="hero__chip"
          initial={reduce ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="hero__chip-dot" />
          <span>
            v{version(release.tag)} is out <em>· {ago(release.publishedAt)}</em>
          </span>
          <IconArrow />
        </motion.a>

        <h1 className="hero__title">
          <WordsIn text="Hear your phone and laptop" delay={0.08} />
          <br />
          <span className="hero__title-2">
            <WordsIn text="in the" delay={0.32} /> <WordsIn text="same buds." className="grad-text" delay={0.44} />
          </span>
        </h1>

        <motion.p
          className="hero__lede lede"
          initial={reduce ? false : { opacity: 0, y: 14, filter: "blur(8px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.9, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          Even cheap buds without multipoint. BudsBridge keeps your buds on the laptop and plays your phone through it, so
          you hear both at once and stop switching.
        </motion.p>

        <motion.div
          className="hero__actions"
          initial={reduce ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.72, ease: [0.16, 1, 0.3, 1] }}
        >
          <DownloadButton />
          <a href={REPO_URL} className="btn btn--glass btn--lg" target="_blank" rel="noreferrer">
            <IconGitHub />
            Source on GitHub
          </a>
        </motion.div>

        <motion.ul
          className="hero__facts"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.95 }}
        >
          <li>Free and open source</li>
          <li>No account</li>
          <li>Nothing to install on your phone</li>
          <li>Windows 11</li>
        </motion.ul>
      </div>

      <div className="hero__stage container" ref={stage}>
        <motion.div
          className="hero__frame"
          style={reduce ? undefined : { rotateX: tilt, scale: lift }}
          initial={reduce ? false : { opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="hero__frame-glow" aria-hidden />
          <Scene />
        </motion.div>

        <div className="hero__mobile-dock">
          <Dock size="card" />
        </div>

        <div className="hero__try">
          <span className="hero__try-label">{state.takenOver ? "Your turn. Press" : "Try it. Click the tiles, or press"}</span>
          <HotkeyKeys pulse={state.hotkey} onPress={pressHotkey} label="Press Ctrl+Alt+B in the demo" />
        </div>
      </div>
    </section>
  );
}
