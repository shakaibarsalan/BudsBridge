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
SCALE=2                  # render at 2x for sharp images
SCREEN_W=2000 SCREEN_H=1800
DOCK_W=380               # logical, see dock.rs
# With no taskbar the dock sits in the bottom-right corner, 12 px from the
# edges, so its bottom edge is fixed while its height follows the content.
DOCK_LEFT=$((SCREEN_W - DOCK_W * SCALE - 12 * SCALE))
DOCK_BOTTOM=$((SCREEN_H - 12 * SCALE))

WORK=$(mktemp -d)
PIDS=()
cleanup() {
  for pid in "${PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
  pgrep -x budsbridge | xargs -r kill 2>/dev/null || true
  rm -rf "$WORK"
}
trap cleanup EXIT

[ -x "$APP" ] || { echo "build the app first: $APP not found" >&2; exit 1; }
mkdir -p "$OUT"

Xvfb "$DISPLAY_NUM" -screen 0 "${SCREEN_W}x${SCREEN_H}x24" >/dev/null 2>&1 &
PIDS+=($!)
sleep 1
export DISPLAY=$DISPLAY_NUM GDK_SCALE=$SCALE BUDSBRIDGE_DEMO=1 BUDSBRIDGE_DOCK_PINNED=1

# A plain desktop behind the dock: a full-screen image window (the dock is
# always on top of it).
convert -size "${SCREEN_W}x${SCREEN_H}" gradient:'#33415c'-'#10131a' "$WORK/desktop.png"
display -geometry +0+0 -immutable "$WORK/desktop.png" &
PIDS+=($!)
sleep 1

# Click a point in the dock given in logical pixels from its left and bottom
# edges; those stay put when the dock grows upwards.
click_dock() { xdotool mousemove "$((DOCK_LEFT + $1 * SCALE))" "$((DOCK_BOTTOM - $2 * SCALE))" click 1; }
key() { xdotool key "$1"; }

dock_window() { xdotool search --onlyvisible --name '^BudsBridge$' | head -1; }

# Screenshot of the dock alone, with rounded corners and a soft shadow.
shot_dock() {
  local win x y w h
  win=$(dock_window)
  eval "$(xdotool getwindowgeometry --shell "$win")"
  x=$X y=$Y w=$WIDTH h=$HEIGHT
  import -window root -crop "${w}x${h}+${x}+${y}" +repage "$WORK/raw.png"
  convert "$WORK/raw.png" -alpha set \
    \( +clone -alpha transparent -fill white -draw "roundrectangle 0,0,$((w - 1)),$((h - 1)),36,36" \) \
    -compose dst-in -composite "$WORK/rounded.png"
  convert "$WORK/rounded.png" \( +clone -background black -shadow 45x28+0+18 \) +swap \
    -background none -layers merge +repage -resize 50% "$OUT/$1.png"
}

launch() { # $1 = GTK theme, $2 = config dir
  XDG_CONFIG_HOME=$2 XDG_DATA_HOME=$2 GTK_THEME=$1 \
    dbus-launch --exit-with-session "$APP" >"$WORK/app.log" 2>&1 &
  PIDS+=($!)
  until dock_window >/dev/null 2>&1 && [ -n "$(dock_window)" ]; do sleep 0.2; done
  sleep 5 # let the UI load and the demo devices appear
}

stop_app() { pgrep -x budsbridge | xargs -r kill || true; sleep 2; }

# Light theme stills.
launch Adwaita "$WORK/light"
shot_dock dock-light
stop_app

# Dark theme: stills and the recorded walkthrough.
launch Adwaita:dark "$WORK/dark"
shot_dock dock

REC_X=$((DOCK_LEFT - 60)) REC_Y=300
ffmpeg -loglevel error -y -f x11grab -framerate 15 \
  -video_size "$((SCREEN_W - REC_X))x$((SCREEN_H - REC_Y))" -i "$DISPLAY_NUM+$REC_X,$REC_Y" \
  -c:v libx264 -preset veryfast -pix_fmt yuv420p "$WORK/demo.mp4" &
FFMPEG=$!
sleep 1.5

click_dock 270 241  # Phone audio tile: hear the phone in the buds too
sleep 3.2; shot_dock dock-bridge
click_dock 105 241  # Buds tile: hand the buds back (to the phone)
sleep 2.6
key ctrl+alt+b      # hotkey: buds back on the laptop
sleep 2.8
click_dock 60 120   # Devices: open the list
sleep 1.4; shot_dock dock-devices
sleep 0.6
click_dock 60 271   # and close it
sleep 1.2

kill -INT "$FFMPEG"; wait "$FFMPEG" || true
cp "$WORK/demo.mp4" "$OUT/demo.mp4"
ffmpeg -loglevel error -y -i "$WORK/demo.mp4" \
  -vf "fps=12,scale=440:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4" \
  "$OUT/demo.gif"

# The settings window.
click_dock 60 32    # All settings
sleep 2
SETTINGS=$(xdotool search --onlyvisible --name 'BudsBridge settings' | head -1)
xdotool windowmove "$SETTINGS" 0 0 windowsize "$SETTINGS" 920 1720
sleep 2
import -window root -crop 920x1720+0+0 +repage -resize 50% "$OUT/settings.png"

convert "$OUT/dock-light.png" "$OUT/dock.png" -background none +append "$OUT/light-dark.png"
ls -lh "$OUT"
