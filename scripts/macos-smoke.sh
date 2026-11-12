#!/usr/bin/env bash
# Checks a built macOS bundle on a Mac (CI, or locally after `pnpm tauri build`):
# the signature, both architectures, the Info.plist, the disk image, and that
# the app starts, stays up and draws its menu bar icon and dock, in demo mode
# and with the real Bluetooth backend. Logs and screenshots go to ./smoke.
#
#   scripts/macos-smoke.sh target/universal-apple-darwin/release/bundle
set -euo pipefail

bundle="${1:?usage: macos-smoke.sh <bundle dir>}"
app="$bundle/macos/BudsBridge.app"
exe="$app/Contents/MacOS/budsbridge"
dmg=$(ls "$bundle"/dmg/*.dmg | head -n 1)
out=smoke
mkdir -p "$out"

echo "== Signature (ad-hoc until the app is notarized)"
codesign --verify --deep --strict --verbose=2 "$app"
codesign -dv "$app" 2>&1 | grep -E "^(Identifier|Format|CodeDirectory|Signature)" || true

echo "== Architectures"
archs=$(lipo -archs "$exe")
echo "$archs"
[[ "$archs" == *x86_64* && "$archs" == *arm64* ]] || { echo "not a universal binary" >&2; exit 1; }

echo "== Info.plist"
plutil -p "$app/Contents/Info.plist" | tee "$out/Info.plist.txt"
grep -q '"NSBluetoothAlwaysUsageDescription"' "$out/Info.plist.txt" \
  || { echo "missing NSBluetoothAlwaysUsageDescription" >&2; exit 1; }
grep -Eq '"LSUIElement" => (true|1)' "$out/Info.plist.txt" \
  || { echo "missing LSUIElement" >&2; exit 1; }
grep -q '"LSMinimumSystemVersion" => "12.0"' "$out/Info.plist.txt" \
  || { echo "minimum macOS is not 12.0" >&2; exit 1; }

echo "== Disk image $(basename "$dmg") ($(du -h "$dmg" | cut -f1))"
hdiutil verify "$dmg"
mount=$(mktemp -d)
hdiutil attach -nobrowse -readonly -mountpoint "$mount" "$dmg" > /dev/null
ls -la "$mount"
test -d "$mount/BudsBridge.app" || { echo "the image has no BudsBridge.app" >&2; exit 1; }
test -L "$mount/Applications" || { echo "the image has no Applications link" >&2; exit 1; }
codesign --verify --deep --strict "$mount/BudsBridge.app"
hdiutil detach "$mount" > /dev/null

echo "== Gatekeeper (rejects until the app is notarized; shown for the record)"
spctl --assess --type execute -vv "$app" 2>&1 || true

# Starts the app, waits, screenshots the screen, then quits it.
run() {
  local name=$1
  shift
  env "$@" "$exe" > "$out/$name.log" 2>&1 &
  local pid=$!
  sleep 12
  if ! kill -0 "$pid" 2> /dev/null; then
    echo "$name: BudsBridge exited early" >&2
    cat "$out/$name.log" >&2
    return 1
  fi
  screencapture -x "$out/$name.png" || echo "screencapture failed"
  ps -o pid,rss,%cpu,command -p "$pid" | tee "$out/$name.ps.txt"
  kill "$pid"
  wait "$pid" 2> /dev/null || true
  echo "-- $name log"
  cat "$out/$name.log"
}

echo "== Demo mode (simulated devices)"
run demo BUDSBRIDGE_DEMO=1 BUDSBRIDGE_DOCK_PINNED=1

echo "== Real Bluetooth backend"
run real BUDSBRIDGE_DOCK_PINNED=1

echo "== AirPlay Receiver setting, as BudsBridge reads it"
defaults read com.apple.controlcenter AirplayRecieverEnabled 2>&1 || true
defaults -currentHost read com.apple.controlcenter AirplayRecieverEnabled 2>&1 || true

echo "smoke test passed"
