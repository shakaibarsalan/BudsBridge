import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { bytes } from "../lib/format";
import { DOWNLOAD_PAGE } from "../lib/links";
import { useLatestRelease, version, type Asset } from "../lib/release";
import { IconArrow, IconCheck, IconWindows } from "./Icons";

const EVENT = "bb:download";

/** Tell the page a download started, so the toast can show the first-run hint. */
export function announceDownload(asset: Asset) {
  window.dispatchEvent(new CustomEvent(EVENT, { detail: asset.name }));
}

/**
 * The main download button. It links straight to the newest installer on GitHub, so
 * the file is always the latest build; the download page has the other files.
 */
export function DownloadButton({ size = "lg" }: { size?: "lg" | "md" }) {
  const { release, installer } = useLatestRelease();
  return (
    <a
      href={installer?.url ?? DOWNLOAD_PAGE}
      className={`btn btn--primary ${size === "lg" ? "btn--lg" : ""}`}
      onClick={() => installer && announceDownload(installer)}
    >
      <IconWindows />
      Download for Windows
      {installer && (
        <span className="btn__meta">
          v{version(release.tag)} · {bytes(installer.size)}
        </span>
      )}
    </a>
  );
}

/** "Download started" with the one thing people trip on: the SmartScreen warning. */
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
            <span>
              Windows may say <em>“Windows protected your PC”</em> the first time. Click <b>More info</b>, then{" "}
              <b>Run anyway</b>.
            </span>
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
