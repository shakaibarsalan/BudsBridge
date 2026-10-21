#!/usr/bin/env bash
# Builds the walkthrough video, docs/media/tutorial.mp4: speaks the lines,
# records the app in demo mode on a virtual display in time with them, then
# draws the pointer, rings, key badges and subtitles and adds the voice.
#
# Linux only. Needs Xvfb, xdotool, ffmpeg, ImageMagick, dbus-launch, and
# Python 3 with kokoro-onnx, numpy, Pillow and python-xlib; see narrate.py
# for the voice model files. Run from anywhere:
#   scripts/video/make.sh
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/../.." && pwd)
cd "$ROOT"
export OUT_DIR=${OUT_DIR:-$ROOT/target/video}

(cd apps/desktop && pnpm tauri build --debug --no-bundle)
OUT_DIR=$OUT_DIR/voice python3 scripts/video/narrate.py
python3 scripts/video/record.py
python3 scripts/video/compose.py
