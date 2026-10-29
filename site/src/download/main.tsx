import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DownloadToast } from "../components/DownloadCta";
import { Footer } from "../components/Footer";
import { Nav } from "../components/Nav";
import { startSmoothScroll } from "../lib/smooth";
import { loadSupport } from "../lib/support";
import "../styles/base.css";
import "../styles/site.css";
import "../styles/scene.css";
import "../styles/download.css";
import { DownloadPage } from "./DownloadPage";

startSmoothScroll();
loadSupport();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav />
      <main id="main">
        <DownloadPage />
      </main>
      <Footer />
      <DownloadToast stepsHref="#first-run" />
    </MotionConfig>
  </StrictMode>,
);
