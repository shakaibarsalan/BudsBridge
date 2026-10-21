import { fileURLToPath } from "node:url";

import { defineConfig, mergeConfig } from "vite";

import base from "./vite.config";

// Builds the video stage (video.html): the real dock with `lib/api` swapped
// for a scripted store. scripts/video/render.py draws it frame by frame.
export default mergeConfig(
  base,
  defineConfig({
    build: {
      outDir: "dist-video",
      rollupOptions: { input: "video.html" },
    },
    resolve: {
      alias: [
        {
          find: /^(?:\.\.?\/)+(?:lib\/)?api$/,
          replacement: fileURLToPath(new URL("./src/video/mockApi.ts", import.meta.url)),
        },
      ],
    },
  }),
);
