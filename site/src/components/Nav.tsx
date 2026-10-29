import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";
import { DOWNLOAD_PAGE, HOME } from "../lib/links";
import { REPO_URL } from "../lib/release";
import { IconDownload, IconGitHub } from "./Icons";
import { Logo } from "./Logo";

const LINKS = [
  { href: "#how", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#watch", label: "Watch" },
  { href: "#faq", label: "FAQ" },
];

export function Nav({ onHome = false, status }: { onHome?: boolean; status?: ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const href = (h: string) => (onHome ? h : HOME + h);

  return (
    <header className={`nav ${scrolled || open ? "nav--solid" : ""}`}>
      <div className="nav__inner container">
        <a href={HOME} className="nav__home" aria-label="BudsBridge home">
          <Logo />
        </a>

        <nav className="nav__links" aria-label="Main">
          {LINKS.map((l) => (
            <a key={l.href} href={href(l.href)} className="nav__link">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="nav__end">
          {status}
          <a href={REPO_URL} className="nav__icon" aria-label="BudsBridge on GitHub" target="_blank" rel="noreferrer">
            <IconGitHub />
          </a>
          <a href={DOWNLOAD_PAGE} className="btn btn--primary btn--sm nav__cta">
            <IconDownload />
            Download
          </a>
          <button
            className={`nav__burger ${open ? "is-open" : ""}`}
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            className="nav__sheet"
            aria-label="Menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {LINKS.map((l, i) => (
              <motion.a
                key={l.href}
                href={href(l.href)}
                onClick={() => setOpen(false)}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.04 * i + 0.05 }}
              >
                {l.label}
              </motion.a>
            ))}
            <a href={REPO_URL} target="_blank" rel="noreferrer" onClick={() => setOpen(false)}>
              GitHub
            </a>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
