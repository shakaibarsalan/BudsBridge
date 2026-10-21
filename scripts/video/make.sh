#!/usr/bin/env bash
# Builds the walkthrough video, docs/media/tutorial.mp4: speaks the lines,
# builds the video stage (the real dock on a drawn Windows 11 style desktop)
# and renders it frame by frame in headless Chromium, in time with the voice.
#
# Needs pnpm, ffmpeg, and Python 3 with kokoro-onnx, numpy and playwright;
# see narrate.py for the voice model files. Run from anywhere:
#   scripts/video/make.sh
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
export OUT_DIR=${OUT_DIR:-$ROOT/target/video}

(cd apps/desktop && pnpm vite build --config vite.video.config.ts)
OUT_DIR=$OUT_DIR/voice python3 scripts/video/narrate.py
python3 scripts/video/render.py
