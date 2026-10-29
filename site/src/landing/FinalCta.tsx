import { DownloadButton } from "../components/DownloadCta";
import { IconArrow } from "../components/Icons";
import { LogoMark } from "../components/Logo";
import { Reveal } from "../components/Reveal";
import { bytes } from "../lib/format";
import { DOWNLOAD_PAGE } from "../lib/links";
import { useLatestRelease } from "../lib/release";

export function FinalCta() {
  const { installer } = useLatestRelease();
  return (
    <section className="section final">
      <div className="container">
        <Reveal className="final__card">
          <div className="final__beam" aria-hidden />
          <div className="final__orbit" aria-hidden>
            <span />
            <span />
            <span />
          </div>
          <div className="final__logo">
            <LogoMark size={64} />
          </div>
          <h2 className="h-section">
            One pair of buds.
            <br />
            <span className="grad-text">Both your devices.</span>
          </h2>
          <p className="lede">
            Free for Windows 11. {installer ? `A ${bytes(installer.size)} installer` : "An installer"}, or one .exe you just
            open.
          </p>
          <div className="final__actions">
            <DownloadButton />
            <a href={DOWNLOAD_PAGE} className="text-link">
              All files, checksums and release notes <IconArrow />
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
