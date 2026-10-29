import react from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";

// Two static pages: the landing page and /download/.
// SITE_BASE lets the same build live at a sub-path (GitHub Pages) or at the root (Vercel).
export default defineConfig({
  base: process.env.SITE_BASE ?? "/",
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    // The screenshots and videos live in ../docs/media, shared with the README.
    fs: { allow: [resolve(__dirname, "..")] },
  },
  build: {
    target: "es2022",
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        download: resolve(__dirname, "download/index.html"),
      },
    },
  },
});
