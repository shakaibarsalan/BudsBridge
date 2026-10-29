import { MotionConfig } from "motion/react";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { DownloadToast } from "../components/DownloadCta";
import { Footer } from "../components/Footer";
import { Nav } from "../components/Nav";
import { DemoProvider, useDemo } from "../lib/demo";
import { startSmoothScroll } from "../lib/smooth";
import { loadSupport } from "../lib/support";
import "../styles/base.css";
import "../styles/site.css";
import "../styles/scene.css";
import "../styles/sections.css";
import { Faq } from "./Faq";
import { Features } from "./Features";
import { FinalCta } from "./FinalCta";
import { Hero } from "./Hero";
import { HowItWorks } from "./HowItWorks";
import { OpenSource } from "./OpenSource";
import { Problem } from "./Problem";
import { Watch } from "./Watch";

/** A tiny copy of the dock's headline in the nav, so the demo state follows you down the page. */
function NavStatus() {
  const { view } = useDemo();
  return (
    <span className={`nav__status nav__status--${view.sources}`} aria-hidden>
      <i />
      {view.headline}
    </span>
  );
}

function Landing() {
  return (
    <DemoProvider>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <Nav onHome status={<NavStatus />} />
      <main id="main">
        <Hero />
        <Problem />
        <HowItWorks />
        <Features />
        <Watch />
        <OpenSource />
        <Faq />
        <FinalCta />
      </main>
      <Footer />
      <DownloadToast />
    </DemoProvider>
  );
}

startSmoothScroll();
loadSupport();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <Landing />
    </MotionConfig>
  </StrictMode>,
);
