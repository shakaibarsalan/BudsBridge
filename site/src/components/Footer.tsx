import { DOWNLOAD_PAGE, HOME } from "../lib/links";
import { RELEASES_URL, REPO_URL } from "../lib/release";
import { Logo } from "./Logo";

export function Footer() {
  return (
    <footer className="footer">
      <div className="container footer__inner">
        <div className="footer__brand">
          <a href={HOME} aria-label="BudsBridge home">
            <Logo />
          </a>
          <p>One pair of buds for your phone and your laptop. Free and open source, for Windows 11.</p>
        </div>
        <nav className="footer__cols" aria-label="Footer">
          <div>
            <h4>Get it</h4>
            <a href={DOWNLOAD_PAGE}>Download</a>
            <a href={RELEASES_URL} target="_blank" rel="noreferrer">
              All releases
            </a>
            <a href={`${REPO_URL}#install`} target="_blank" rel="noreferrer">
              Install notes
            </a>
          </div>
          <div>
            <h4>Learn</h4>
            <a href={`${REPO_URL}/blob/main/docs/FEASIBILITY.md`} target="_blank" rel="noreferrer">
              Feasibility study
            </a>
            <a href={`${REPO_URL}/blob/main/docs/ARCHITECTURE.md`} target="_blank" rel="noreferrer">
              Architecture
            </a>
            <a href={`${REPO_URL}#code-signing-policy`} target="_blank" rel="noreferrer">
              Code signing policy
            </a>
          </div>
          <div>
            <h4>Project</h4>
            <a href={REPO_URL} target="_blank" rel="noreferrer">
              GitHub
            </a>
            <a href={`${REPO_URL}/issues`} target="_blank" rel="noreferrer">
              Report a problem
            </a>
            <a href={`${REPO_URL}/blob/main/LICENSE`} target="_blank" rel="noreferrer">
              MIT license
            </a>
          </div>
        </nav>
      </div>
      <div className="container footer__base">
        <span>© {new Date().getFullYear()} Muhammad Shakaib Arsalan</span>
        <span>Not affiliated with Microsoft. Windows is a trademark of Microsoft.</span>
      </div>
    </footer>
  );
}
