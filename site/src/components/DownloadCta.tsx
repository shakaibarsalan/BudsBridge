import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { bytes } from "../lib/format";
import { DOWNLOAD_PAGE } from "../lib/links";
import { useOs } from "../lib/platform";
import { useLatestRelease, version, type Asset } from "../lib/release";
import { IconApple, IconArrow, IconCheck, IconWindows } from "./Icons";

const EVENT = "bb:download";

/** Tell the page a download started, so the toast can show the first-run hint. */
export function announceDownload(asset: Asset) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: asset.name }));
}

/**
 * The main download button. It links straight to the newest file on GitHub, so it is
 * always the latest build: the Mac app for Mac visitors when the release has one, the
 * Windows installer for everyone else. The download page has the other files.
 */
export function DownloadButton({ size = "lg" }: { size?: "lg" | "md" }) {
  const { release, installer, mac } = useLatestRelease();
  const forMac = useOs() === "mac" && !!mac;
  const asset = forMac ? mac : installer;
  return (
    <a
      href={asset?.url ?? DOWNLOAD_PAGE}
      className={`btn btn--primary ${size === "lg" ? "btn--lg" : ""}`}
      onClick={() => asset && announceDownload(asset)}
    >
      {forMac ? <IconApple /> : <IconWindows />}
      Download for {forMac ? "Mac" : "Windows"}
      {asset && (
        <span className="btn__meta">
          v{version(release.tag)} · {bytes(asset.size)}
        </span>
      )}
    </a>
  );
}

/** "Download started" with the one thing people trip on: SmartScreen on Windows, the first open on a Mac. */
export function DownloadToast({ stepsHref = `${DOWNLOAD_PAGE}#first-run` }: { stepsHref?: string }) {
  const [file, setFile] = useState<string | null>(null);
  useEffect(() => {
    const on = (e: Event) => setFile((e as CustomEvent<string>).detail);
    window.addEventListener(EVENT, on);
    return () => window.removeEventListener(EVENT, on);
  }, []);
  useEffect(() => {
    if (!file) return;
    const t = setTimeout(() => setFile(null), 14000);
    return () => clearTimeout(t);
  }, [file]);

  return (
    <AnimatePresence>
      {file && (
        <motion.div
          className="toast"
          role="status"
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.97 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="toast__icon">
            <IconCheck />
          </span>
          <div className="toast__text">
            <strong>Downloading {file}</strong>
            {/\.dmg$/i.test(file) ? (
              <span>
                macOS says it can't verify BudsBridge the first time. On macOS 15 or later, click <b>Done</b>, then{" "}
                <b>Open Anyway</b> in System Settings → Privacy &amp; Security.
              </span>
            ) : (
              <span>
                Windows may say <em>“Windows protected your PC”</em> the first time. Click <b>More info</b>, then{" "}
                <b>Run anyway</b>.
              </span>
            )}
            <a href={stepsHref}>
              First-run steps <IconArrow />
            </a>
          </div>
          <button className="toast__close" onClick={() => setFile(null)} aria-label="Close">
            ×
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
