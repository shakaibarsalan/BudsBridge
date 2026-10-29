import { AnimatePresence, motion, useScroll, useTransform } from "motion/react";
import { useRef, useState } from "react";
import tutorial from "../../../docs/media/tutorial.mp4";
import { IconCheck, IconPlay } from "../components/Icons";
import { Reveal } from "../components/Reveal";

const SHOWS = [
  "The tray dock",
  "Phone audio turning on: 2 sources in the buds",
  "A second phone joining",
  "Handing the buds to the phone and back",
];

export function Watch() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start end", "center center"] });
  const rotate = useTransform(scrollYProgress, [0, 1], [-6, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [60, 0]);

  const play = () => {
    setPlaying(true);
    video.current?.play().catch(() => setPlaying(false));
  };

  return (
    <section className="section watch" id="watch" ref={section}>
      <div className="container watch__grid">
        <Reveal className="watch__copy">
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            Watch
          </span>
          <h2 className="h-section">See it in 30 seconds.</h2>
          <p className="lede">The whole idea in one short video, with voice-over and subtitles.</p>
          <ul className="watch__list">
            {SHOWS.map((s) => (
              <li key={s}>
                <IconCheck />
                {s}
              </li>
            ))}
          </ul>
        </Reveal>

        <motion.div className="watch__frame" style={{ rotate, y }}>
          <video
            ref={video}
            src={`${tutorial}#t=0.4`}
            preload="metadata"
            playsInline
            controls={playing}
            onEnded={() => setPlaying(false)}
            aria-label="BudsBridge in 30 seconds, with voice-over and subtitles"
          />
          <AnimatePresence>
            {!playing && (
              <motion.button
                className="watch__play"
                onClick={play}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                aria-label="Play the 30-second video"
              >
                <span className="watch__play-btn">
                  <span className="watch__ring" />
                  <span className="watch__ring watch__ring--2" />
                  <IconPlay />
                </span>
                <span className="watch__play-label">Play · 0:33 · sound on</span>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
