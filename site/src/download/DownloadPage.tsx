import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { announceDownload } from "../components/DownloadCta";
import { IconArrow, IconChat, IconCheck, IconCopy, IconDownload, IconGitHub, IconShield, IconWindows } from "../components/Icons";
import { openSupport, supportEnabled } from "../lib/support";
import { LogoMark } from "../components/Logo";
import { Reveal, WordsIn } from "../components/Reveal";
import { bytes, isWindows, longDate, shortDate } from "../lib/format";
import { fetchAllReleases, REPO_URL, RELEASES_URL, useLatestRelease, version, type Asset, type OlderRelease } from "../lib/release";
import { ReleaseNotes } from "./ReleaseNotes";
import { SmartScreen } from "./SmartScreen";

function useCopy() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1600);
    } catch {
      /* clipboard blocked: the text is still selectable */
    }
  };
  return { copied, copy };
}

function Hash({ asset, copied, onCopy }: { asset: Asset; copied: boolean; onCopy: () => void }) {
  if (!asset.sha256) {
    return (
      <div className="hash hash--missing">
        SHA-256 is in <code>SHA256SUMS.txt</code> on the release.
      </div>
    );
  }
  return (
    <div className="hash">
      <span className="hash__label">SHA-256</span>
      <code title={asset.sha256}>{asset.sha256}</code>
      <button onClick={onCopy} aria-label={`Copy the SHA-256 of ${asset.name}`} className={copied ? "is-copied" : ""}>
        {copied ? <IconCheck /> : <IconCopy />}
      </button>
    </div>
  );
}

function Option({
  asset,
  kind,
  copied,
  onCopy,
  delay,
}: {
  asset: Asset;
  kind: "installer" | "portable";
  copied: boolean;
  onCopy: () => void;
  delay: number;
}) {
  const installer = kind === "installer";
  return (
    <Reveal delay={delay} className={`opt ${installer ? "opt--main" : ""}`}>
      {installer && <span className="opt__tag">Recommended</span>}
      <div className="opt__head">
        <span className="opt__icon">{installer ? <IconWindows /> : <IconDownload />}</span>
        <div>
          <h2>{installer ? "Installer" : "Portable .exe"}</h2>
          <p className="opt__file" title={asset.name}>
            {asset.name}
          </p>
        </div>
      </div>
      <ul className="opt__list">
        {(installer
          ? ["Start menu entry and an uninstaller", "Installs for your user only, no admin prompt", "Easy to keep up to date"]
          : ["One file, nothing to install", "Download it and open it", "Opening a newer copy takes over from the old one"]
        ).map((t) => (
          <li key={t}>
            <IconCheck />
            {t}
          </li>
        ))}
      </ul>
      <a
        href={asset.url}
        className={`btn ${installer ? "btn--primary" : "btn--glass"} btn--lg opt__btn`}
        onClick={() => announceDownload(asset)}
      >
        <IconDownload />
        Download {installer ? "installer" : ".exe"}
        <span className="btn__meta">{bytes(asset.size)}</span>
      </a>
      <Hash asset={asset} copied={copied} onCopy={onCopy} />
    </Reveal>
  );
}

const STEPS = [
  {
    title: "Open the file",
    body: "Run the installer, or just open BudsBridge.exe. No admin prompt.",
  },
  {
    title: "Get past SmartScreen once",
    body: "The build isn't code-signed yet, so Windows warns the first time. Click More info, then Run anyway.",
  },
  {
    title: "Pair and click the tray icon",
    body: "Pair your buds (and phone) in Settings → Bluetooth & devices, then open BudsBridge from the tray.",
  },
];

function Versions() {
  const [list, setList] = useState<OlderRelease[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    fetchAllReleases().then(setList, () => setFailed(true));
  }, []);
  if (failed) {
    return (
      <a className="text-link" href={RELEASES_URL} target="_blank" rel="noreferrer">
        See every release on GitHub <IconArrow />
      </a>
    );
  }
  return (
    <ul className="versions">
      {(list ?? Array.from({ length: 4 }, () => null)).map((r, i) =>
        r ? (
          <li key={r.tag}>
            <a href={r.url} target="_blank" rel="noreferrer">
              <span className="versions__tag">{r.tag}</span>
              {i === 0 && <span className="versions__latest">Latest</span>}
              <span className="versions__date">{shortDate(r.publishedAt)}</span>
              <IconArrow />
            </a>
          </li>
        ) : (
          <li key={i} className="versions__skeleton" />
        ),
      )}
    </ul>
  );
}

export function DownloadPage() {
  const { release, installer, portable, live } = useLatestRelease();
  const { copied, copy } = useCopy();
  const [onWindows, setOnWindows] = useState(true);
  const [started, setStarted] = useState<string | null>(null);

  useEffect(() => {
    setOnWindows(isWindows());
    setStarted(new URLSearchParams(window.location.search).get("started"));
  }, []);

  const verify = `Get-FileHash .\\${portable?.name ?? "BudsBridge.exe"} -Algorithm SHA256`;

  return (
    <>
      <section className="dl-hero">
        <div className="hero__bg" aria-hidden>
          <div className="hero__grid" />
          <div className="hero__aurora hero__aurora--a" />
          <div className="hero__aurora hero__aurora--b" />
        </div>
        <div className="container dl-hero__inner">
          <motion.div
            className="dl-hero__logo"
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <LogoMark size={76} />
            <span className="dl-hero__pulse" />
          </motion.div>
          <h1 className="dl-hero__title">
            <WordsIn text="Download BudsBridge" />
          </h1>
          <motion.div
            className="dl-hero__meta"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.7 }}
          >
            <span className={`dl-live ${live ? "is-live" : ""}`}>
              <i />
              {live ? "Latest from GitHub" : "Checking GitHub…"}
            </span>
            <span>
              <b>v{version(release.tag)}</b> · {longDate(release.publishedAt)}
            </span>
            <span>Windows 11 · x64</span>
          </motion.div>
          <AnimatePresence>
            {!onWindows && (
              <motion.p className="dl-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                You're not on Windows right now. BudsBridge runs on Windows 11, so download it there, or grab it here and move
                it over.
              </motion.p>
            )}
            {started && (
              <motion.p className="dl-note dl-note--ok" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <IconCheck /> {started} is downloading. The steps below show what to do next.
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className="container dl-options">
        {installer && <Option asset={installer} kind="installer" copied={copied === "i"} onCopy={() => copy("i", installer.sha256 ?? "")} delay={0.1} />}
        {portable && <Option asset={portable} kind="portable" copied={copied === "p"} onCopy={() => copy("p", portable.sha256 ?? "")} delay={0.18} />}
        {!installer && !portable && (
          <div className="opt">
            <h2>Files are on GitHub</h2>
            <a className="btn btn--primary btn--lg" href={release.url}>
              Open the release <IconArrow />
            </a>
          </div>
        )}
      </section>

      <section className="section dl-first" id="first-run">
        <div className="container dl-first__grid">
          <Reveal className="dl-first__copy">
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              First run
            </span>
            <h2 className="h-section">Up and running in a minute.</h2>
            <ol className="dl-steps">
              {STEPS.map((s, i) => (
                <Reveal as="li" key={s.title} delay={0.08 * i}>
                  <span className="dl-steps__n">{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
            <div className="dl-sac">
              <IconShield />
              <p>
                <b>Smart App Control on?</b> It blocks unsigned apps outright, with no Run anyway button. Code signing from
                SignPath Foundation is under review; until it ships, you can{" "}
                <a className="text-link" href={`${REPO_URL}#or-build-it-yourself`} target="_blank" rel="noreferrer">
                  build it yourself
                </a>
                .
              </p>
            </div>
            {supportEnabled && (
              <button className="btn btn--glass dl-ask" onClick={openSupport}>
                <IconChat /> Stuck? Ask the BudsBridge assistant
              </button>
            )}
          </Reveal>
          <Reveal delay={0.1} className="dl-first__visual">
            <SmartScreen file={portable?.name ?? installer?.name ?? "BudsBridge.exe"} />
          </Reveal>
        </div>
      </section>

      <section className="section dl-more">
        <div className="container dl-more__grid">
          <Reveal className="dl-card dl-card--notes">
            <div className="dl-card__head">
              <h2>What's new in v{version(release.tag)}</h2>
              <a className="text-link" href={release.url} target="_blank" rel="noreferrer">
                On GitHub <IconArrow />
              </a>
            </div>
            <ReleaseNotes body={release.body} />
          </Reveal>

          <div className="dl-side">
            <Reveal className="dl-card" delay={0.06}>
              <h2>Check the file</h2>
              <p>Compare the hash with the one above or in SHA256SUMS.txt on the release.</p>
              <div className="cmd">
                <code>{verify}</code>
                <button onClick={() => copy("cmd", verify)} aria-label="Copy the PowerShell command" className={copied === "cmd" ? "is-copied" : ""}>
                  {copied === "cmd" ? <IconCheck /> : <IconCopy />}
                </button>
              </div>
            </Reveal>

            <Reveal className="dl-card" delay={0.1}>
              <h2>What you need</h2>
              <ul className="dl-req">
                <li>
                  <IconCheck /> Windows 11, 64-bit
                </li>
                <li>
                  <IconCheck /> Bluetooth on the laptop
                </li>
                <li>
                  <IconCheck /> Buds paired with the laptop
                </li>
                <li>
                  <IconCheck /> For phone audio: the phone paired too, no app on it
                </li>
              </ul>
            </Reveal>

            <Reveal className="dl-card" delay={0.14}>
              <h2>Earlier versions</h2>
              <Versions />
            </Reveal>

            <Reveal className="dl-card" delay={0.18}>
              <h2>Build it yourself</h2>
              <p>Rust (stable, MSVC), Node.js 22+ and pnpm 10, on Windows 11.</p>
              <a className="btn btn--glass btn--sm" href={`${REPO_URL}#or-build-it-yourself`} target="_blank" rel="noreferrer">
                <IconGitHub /> Build steps
              </a>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
