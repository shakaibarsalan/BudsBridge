#!/usr/bin/env bash
# Records the README media from the app in demo mode (simulated devices) on a
# virtual X display, so no Bluetooth hardware is needed and every run is the same.
#
# Linux only. Needs Xvfb, xdotool, ffmpeg, ImageMagick and dbus-launch, plus a
# build with the UI embedded:
#   (cd apps/desktop && pnpm tauri build --debug --no-bundle)
#   scripts/record-demo.sh            # writes docs/media/*
set -euo pipefail

ROOT=$(cd "$(dirname "$0")/.." && pwd)
APP=${APP:-$ROOT/target/debug/budsbridge}
OUT=${OUT:-$ROOT/docs/media}
DISPLAY_NUM=${DISPLAY_NUM:-:97}
SCALE=2              # render at 2x for sharp images
WIDTH=420 HEIGHT=1110 # logical window size
PW=$((WIDTH * SCALE)) PH=$((HEIGHT * SCALE))

WORK=$(mktemp -d)
PIDS=()
cleanup() {
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
  pkill -f "$APP" 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

[ -x "$APP" ] || { echo "build the app first: $APP not found" >&2; exit 1; }
mkdir -p "$OUT"

Xvfb "$DISPLAY_NUM" -screen 0 "$((PW + 40))x$((PH + 40))x24" >/dev/null 2>&1 &
PIDS+=($!)
sleep 1
export DISPLAY=$DISPLAY_NUM GDK_SCALE=$SCALE BUDSBRIDGE_DEMO=1
export XDG_CONFIG_HOME=$WORK/config XDG_DATA_HOME=$WORK/data

# Coordinates below are logical pixels inside the window (top-left at 0,0).
click() { xdotool mousemove "$(($1 * SCALE))" "$(($2 * SCALE))" click 1; }
key() { xdotool key "$1"; }
shot() { import -window root -crop "${PW}x${PH}+0+0" +repage "$OUT/$1.png"; }

launch() { # $1 = GTK theme
  GTK_THEME=$1 dbus-launch --exit-with-session "$APP" >"$WORK/app.log" 2>&1 &
  PIDS+=($!)
  local win
  # The app also owns hidden helper windows named "budsbridge"; take the visible one.
  win=$(xdotool search --sync --onlyvisible --name 'BudsBridge' | head -1)
  xdotool windowmove "$win" 0 0 windowsize "$win" "$PW" "$PH"
  sleep 6 # let the UI load and the demo devices appear
}

stop_app() { pkill -f "$APP" || true; sleep 2; }

# Dark theme still.
launch Adwaita:dark
shot devices-dark
stop_app

# Light theme: stills and the recorded walkthrough.
launch Adwaita
shot devices

ffmpeg -loglevel error -y -f x11grab -framerate 15 -video_size "${PW}x${PH}" \
  -i "$DISPLAY_NUM+0,0" -c:v libx264 -preset veryfast -pix_fmt yuv420p "$WORK/demo.mp4" &
FFMPEG=$!
sleep 1.5

click 86 196   # Demo Buds Pro: Connect
sleep 0.4; shot connecting
sleep 2.2; shot connected
click 52 755   # Phone audio: hear Demo Phone in the buds as well
sleep 0.5; shot phone-connecting
sleep 2.4; shot phone
click 286 196  # Demo Buds Pro becomes the hotkey target
sleep 1.2
key ctrl+alt+b # hotkey: release the buds
sleep 2.4
key ctrl+alt+b # hotkey: connect them again
sleep 2.6; shot settings

kill -INT "$FFMPEG"; wait "$FFMPEG" || true
cp "$WORK/demo.mp4" "$OUT/demo.mp4"
ffmpeg -loglevel error -y -i "$WORK/demo.mp4" \
  -vf "fps=12,scale=420:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" \
  "$OUT/demo.gif"
convert "$OUT/devices.png" "$OUT/devices-dark.png" +append -resize 50% "$OUT/light-dark.png"
ls -lh "$OUT"
