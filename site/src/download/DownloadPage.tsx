import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { announceDownload } from "../components/DownloadCta";
import {
  IconApple,
  IconArrow,
  IconChat,
  IconCheck,
  IconCopy,
  IconDownload,
  IconGitHub,
  IconPhone,
  IconShield,
  IconWindows,
} from "../components/Icons";
import { openSupport, supportEnabled } from "../lib/support";
import { LogoMark } from "../components/Logo";
import { Reveal, WordsIn } from "../components/Reveal";
import { bytes, longDate, shortDate } from "../lib/format";
import { useOs } from "../lib/platform";
import { fetchAllReleases, REPO_URL, RELEASES_URL, useLatestRelease, version, type Asset, type OlderRelease } from "../lib/release";
import { MacFirstOpen } from "./MacFirstOpen";
import { ReleaseNotes } from "./ReleaseNotes";
import { SmartScreen } from "./SmartScreen";

type Platform = "windows" | "mac";
const ISSUES_URL = `${REPO_URL}/issues`;

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

/** The Mac download, or a plain "not in this release" for releases before 0.4.0. */
function MacOption({ asset, tag, copied, onCopy }: { asset: Asset | null; tag: string; copied: boolean; onCopy: () => void }) {
  if (!asset) {
    return (
      <Reveal delay={0.1} className="opt opt--none">
        <div className="opt__head">
          <span className="opt__icon">
            <IconApple />
          </span>
          <div>
            <h2>Mac app</h2>
            <p className="opt__file">Not in v{version(tag)}</p>
          </div>
        </div>
        <p className="opt__text">
          This release has Windows files only. The Mac version starts with v0.4.0, and shows up here once that release is out.
        </p>
        <a className="btn btn--glass btn--lg opt__btn" href={RELEASES_URL} target="_blank" rel="noreferrer">
          <IconGitHub /> All releases on GitHub
        </a>
      </Reveal>
    );
  }
  return (
    <Reveal delay={0.1} className="opt opt--main">
      <span className="opt__tag">Apple Silicon + Intel</span>
      <div className="opt__head">
        <span className="opt__icon">
          <IconApple />
        </span>
        <div>
          <h2>Mac app</h2>
          <p className="opt__file" title={asset.name}>
            {asset.name}
          </p>
        </div>
      </div>
      <ul className="opt__list">
        {["One universal app for Apple Silicon and Intel", "Drag it into Applications and open it", "Lives in the menu bar, no Dock icon"].map(
          (t) => (
            <li key={t}>
              <IconCheck />
              {t}
            </li>
          ),
        )}
      </ul>
      <a href={asset.url} className="btn btn--primary btn--lg opt__btn" onClick={() => announceDownload(asset)}>
        <IconDownload />
        Download for Mac
        <span className="btn__meta">{bytes(asset.size)}</span>
      </a>
      <Hash asset={asset} copied={copied} onCopy={onCopy} />
    </Reveal>
  );
}

/** What is different on a Mac, next to the Mac download. */
function MacNotes() {
  return (
    <Reveal delay={0.18} className="opt opt--info">
      <div className="opt__new">
        <span className="opt__new-tag">New in 0.4.0</span>
        <p>
          The Mac version is built and launched on GitHub's Mac machines, but it hasn't been tested with real buds on a real
          Mac yet. If something's off,{" "}
          <a className="text-link" href={ISSUES_URL} target="_blank" rel="noreferrer">
            please report it on GitHub
          </a>
          .
        </p>
      </div>
      <div className="opt__phone">
        <h3>
          <IconPhone /> Phone audio on a Mac
        </h3>
        <p>
          macOS can't act as a Bluetooth speaker for a phone, so the Bluetooth phone bridge is Windows only. An iPhone or iPad
          can play through the Mac with <b>AirPlay</b> instead, mixed with the Mac's own sound in your buds. Turn on AirPlay
          Receiver in System Settings → General → AirDrop &amp; Handoff.
        </p>
        <p>Android phones can't play through a Mac yet. A USB or Wi-Fi option is planned.</p>
      </div>
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

const MAC_STEPS = [
  {
    title: "Drag it into Applications",
    body: "Open the .dmg, drag BudsBridge into Applications, then open it.",
  },
  {
    title: "Open it anyway, once",
    body: "The app isn't notarized by Apple yet (that needs a paid Apple Developer ID), so macOS says it can't verify it. Click Done, open System Settings → Privacy & Security, scroll down and click Open Anyway next to BudsBridge. Confirm with your password or Touch ID.",
  },
  {
    title: "Allow Bluetooth",
    body: "macOS asks whether BudsBridge may use Bluetooth. Click Allow: it needs that to see and connect your buds.",
  },
  {
    title: "Click the menu bar icon",
    body: "BudsBridge lives in the menu bar, with no Dock icon. Click it to open the dock and connect your paired buds.",
  },
];

/** Windows / Mac switch. The visitor's own system comes first. */
function PlatformTabs({ order, value, onChange }: { order: Platform[]; value: Platform; onChange: (p: Platform) => void }) {
  const refs = useRef<Partial<Record<Platform, HTMLButtonElement | null>>>({});
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const next = order[(order.indexOf(value) + 1) % order.length];
    onChange(next);
    refs.current[next]?.focus();
  };
  return (
    <div className="dl-tabs" role="tablist" aria-label="Choose your computer" onKeyDown={onKey}>
      {order.map((p) => {
        const on = p === value;
        return (
          <button
            key={p}
            ref={(el) => {
              refs.current[p] = el;
            }}
            role="tab"
            id={`tab-${p}`}
            aria-selected={on}
            aria-controls={`panel-${p}`}
            tabIndex={on ? 0 : -1}
            className={`dl-tabs__tab ${on ? "is-on" : ""}`}
            onClick={() => onChange(p)}
          >
            {on && (
              <motion.span layoutId="dl-tab-pill" className="dl-tabs__pill" transition={{ type: "spring", stiffness: 420, damping: 34 }} />
            )}
            {p === "mac" ? <IconApple /> : <IconWindows />}
            <span>{p === "mac" ? "Mac" : "Windows"}</span>
          </button>
        );
      })}
    </div>
  );
}

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
  const { release, installer, portable, mac, live } = useLatestRelease();
  const { copied, copy } = useCopy();
  const os = useOs();
  const order: Platform[] = os === "mac" ? ["mac", "windows"] : ["windows", "mac"];
  const [platform, setPlatform] = useState<Platform>(order[0]);
  const [started, setStarted] = useState<string | null>(null);
  const onMac = platform === "mac";

  useEffect(() => {
    setStarted(new URLSearchParams(window.location.search).get("started"));
  }, []);

  const verify = onMac
    ? `shasum -a 256 ~/Downloads/${mac?.name ?? "BudsBridge-*.dmg"}`
    : `Get-FileHash .\\${portable?.name ?? "BudsBridge.exe"} -Algorithm SHA256`;

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
            <span>{mac ? "Windows 11 · macOS 12+" : "Windows 11 · x64"}</span>
          </motion.div>
          <AnimatePresence>
            {os === "other" && (
              <motion.p className="dl-note" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                BudsBridge doesn't run on this device. It runs on Windows 11 and macOS 12 or later, so download it there, or
                grab it here and move it over.
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

      <div className="container dl-switch">
        <PlatformTabs order={order} value={platform} onChange={setPlatform} />
      </div>

      <section
        className="container dl-options"
        id={`panel-${platform}`}
        role="tabpanel"
        aria-labelledby={`tab-${platform}`}
        key={platform}
      >
        {onMac ? (
          <>
            <MacOption asset={mac} tag={release.tag} copied={copied === "m"} onCopy={() => copy("m", mac?.sha256 ?? "")} />
            <MacNotes />
          </>
        ) : (
          <>
            {installer && (
              <Option asset={installer} kind="installer" copied={copied === "i"} onCopy={() => copy("i", installer.sha256 ?? "")} delay={0.1} />
            )}
            {portable && (
              <Option asset={portable} kind="portable" copied={copied === "p"} onCopy={() => copy("p", portable.sha256 ?? "")} delay={0.18} />
            )}
            {!installer && !portable && (
              <div className="opt">
                <h2>Files are on GitHub</h2>
                <a className="btn btn--primary btn--lg" href={release.url}>
                  Open the release <IconArrow />
                </a>
              </div>
            )}
          </>
        )}
      </section>

      <section className="section dl-first" id="first-run">
        <div className="container dl-first__grid" key={platform}>
          <Reveal className="dl-first__copy">
            <span className="eyebrow">
              <span className="eyebrow__dot" />
              First run {onMac ? "on a Mac" : "on Windows"}
            </span>
            <h2 className="h-section">Up and running in a minute.</h2>
            <ol className="dl-steps">
              {(onMac ? MAC_STEPS : STEPS).map((s, i) => (
                <Reveal as="li" key={s.title} delay={0.08 * i}>
                  <span className="dl-steps__n">{i + 1}</span>
                  <div>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
                  </div>
                </Reveal>
              ))}
            </ol>
            {onMac ? (
              <div className="dl-sac">
                <IconShield />
                <p>
                  <b>On macOS 12 to 14?</b> Step 2 works differently there: Control-click (right-click) BudsBridge in
                  Applications, choose Open, then Open again.
                </p>
              </div>
            ) : (
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
            )}
            {supportEnabled && (
              <button className="btn btn--glass dl-ask" onClick={openSupport}>
                <IconChat /> Stuck? Ask the BudsBridge assistant
              </button>
            )}
          </Reveal>
          <Reveal delay={0.1} className="dl-first__visual">
            {onMac ? <MacFirstOpen /> : <SmartScreen file={portable?.name ?? installer?.name ?? "BudsBridge.exe"} />}
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
              <p>
                In {onMac ? "Terminal" : "PowerShell"}, run this and compare the hash with the one above or in SHA256SUMS.txt on
                the release.
              </p>
              <div className="cmd">
                <code>{verify}</code>
                <button
                  onClick={() => copy("cmd", verify)}
                  aria-label={`Copy the ${onMac ? "Terminal" : "PowerShell"} command`}
                  className={copied === "cmd" ? "is-copied" : ""}
                >
                  {copied === "cmd" ? <IconCheck /> : <IconCopy />}
                </button>
              </div>
            </Reveal>

            <Reveal className="dl-card" delay={0.1}>
              <h2>What you need {onMac ? "on a Mac" : "on Windows"}</h2>
              <ul className="dl-req">
                {(onMac
                  ? [
                      "macOS 12 Monterey or later",
                      "Apple Silicon or Intel: one app for both",
                      "Bluetooth on the Mac, buds paired with it",
                      "For iPhone or iPad audio: AirPlay Receiver on",
                    ]
                  : [
                      "Windows 11, 64-bit",
                      "Bluetooth on the laptop",
                      "Buds paired with the laptop",
                      "For phone audio: the phone paired too, no app on it",
                    ]
                ).map((t) => (
                  <li key={t}>
                    <IconCheck /> {t}
                  </li>
                ))}
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
