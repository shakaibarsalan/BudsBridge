import { AnimatePresence, motion } from "motion/react";
import { useState, type ReactNode } from "react";
import { IconChat } from "../components/Icons";
import { Reveal } from "../components/Reveal";
import { REPO_URL } from "../lib/release";
import { openSupport, supportEnabled } from "../lib/support";

const QA: { q: string; a: ReactNode }[] = [
  {
    q: "Do my buds need multipoint?",
    a: "No, that's the point. BudsBridge is for buds that hold one connection at a time. They stay connected to the laptop, and the phone plays through the laptop into them.",
  },
  {
    q: "Which phones work?",
    a: "Any phone that can play to a Bluetooth speaker. It has been tested with two Android phones at once (OPPO A83 and Pixel 7). iPhone should work the same way, since it's plain Bluetooth audio, but it hasn't been tested yet.",
  },
  {
    q: "Do I need an app on my phone?",
    a: "No. The phone just sees the laptop as a Bluetooth speaker. Pair the phone with the laptop once in Bluetooth & devices.",
  },
  {
    q: "Windows says “Windows protected your PC”. Is it safe?",
    a: (
      <>
        The build isn't code-signed yet, so SmartScreen warns the first time. Click <b>More info</b>, then <b>Run anyway</b>.
        The code is open on GitHub, and every release has SHA-256 checksums. Free code signing from SignPath Foundation is
        under review.
      </>
    ),
  },
  {
    q: "It's blocked and there's no Run anyway button.",
    a: "That's Smart App Control. It blocks unsigned apps outright and offers no way past it. Once the signed builds ship, it will open normally. Until then you can build it yourself from the source.",
  },
  {
    q: "Is there any delay on the phone's sound?",
    a: "Some delay is likely, because the phone's sound makes two Bluetooth hops: phone to laptop, then laptop to buds. It hasn't been measured yet; the hardware checklist on GitHub tracks it.",
  },
  {
    q: "Does it work on Windows 10, macOS or Linux?",
    a: "Windows 11 only for now. The demo mode runs anywhere for development, but talking to real Bluetooth devices needs Windows 11.",
  },
  {
    q: "Is it really free?",
    a: (
      <>
        Yes. It's MIT licensed, with no account, ads or tracking. If it helps you, a star on{" "}
        <a className="text-link" href={REPO_URL} target="_blank" rel="noreferrer">
          GitHub
        </a>{" "}
        helps others find it.
      </>
    ),
  },
];

function Item({ q, a, open, onToggle, i }: { q: string; a: ReactNode; open: boolean; onToggle: () => void; i: number }) {
  return (
    <Reveal as="li" delay={i * 0.04} className={`faq__item ${open ? "is-open" : ""}`}>
      <h3>
        <button aria-expanded={open} onClick={onToggle} id={`faq-q-${i}`} aria-controls={`faq-a-${i}`}>
          <span>{q}</span>
          <span className="faq__plus" aria-hidden />
        </button>
      </h3>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={`faq-a-${i}`}
            role="region"
            aria-labelledby={`faq-q-${i}`}
            className="faq__a"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <p>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </Reveal>
  );
}

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section faq" id="faq">
      <div className="container faq__grid">
        <Reveal className="section-head faq__head">
          <span className="eyebrow">
            <span className="eyebrow__dot" />
            FAQ
          </span>
          <h2 className="h-section">Questions, answered straight.</h2>
          {supportEnabled ? (
            <>
              <p className="lede">Still stuck? The BudsBridge assistant knows the app, by text or by voice.</p>
              <button className="btn btn--glass faq__ask" onClick={openSupport}>
                <IconChat /> Ask the assistant
              </button>
            </>
          ) : (
            <p className="lede">
              Still stuck?{" "}
              <a className="text-link" href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
                Open an issue on GitHub
              </a>
              .
            </p>
          )}
        </Reveal>
        <ul className="faq__list">
          {QA.map((x, i) => (
            <Item key={x.q} {...x} i={i} open={open === i} onToggle={() => setOpen(open === i ? null : i)} />
          ))}
        </ul>
      </div>
    </section>
  );
}
