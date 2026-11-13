# Development

## Prerequisites

- Rust (stable) with the MSVC toolchain on Windows, or the Xcode Command Line Tools on macOS
  (`xcode-select --install`; they compile the small Objective-C part of the Mac backend)
- Node.js 22+ and pnpm 10 (`corepack enable`)
- Windows 11 or macOS 12+ for real devices. Linux runs in **demo mode** with simulated devices.
- Linux only: `libwebkit2gtk-4.1-dev libayatana-appindicator3-dev librsvg2-dev libxdo-dev`

## Run

```bash
cd apps/desktop
pnpm install
pnpm tauri dev
```

Demo mode (simulated devices; useful for UI work and screenshots):

```powershell
$env:BUDSBRIDGE_DEMO = "1"; pnpm tauri dev   # PowerShell
```

```bash
BUDSBRIDGE_DEMO=1 pnpm tauri dev             # bash
```

In demo mode the dock closes when it loses focus, like on Windows. To keep it open (handy on
a virtual display or while recording), also set `BUDSBRIDGE_DOCK_PINNED=1`.

## Test

```bash
cargo test                      # core + Windows and Mac backend helpers (any OS)
cd apps/desktop && pnpm build   # the desktop crate embeds the built UI
cargo test --workspace          # everything, including the desktop crate
cd apps/desktop && pnpm test    # React components (Vitest)
```

Lints match CI: `cargo fmt --all --check`, `cargo clippy --workspace --all-targets -- -D warnings`
and `pnpm typecheck`.

## Build the installer

```bash
cd apps/desktop
pnpm tauri build   # target/release/bundle/nsis/BudsBridge_<version>_x64-setup.exe
```

On a Mac, `pnpm tauri build` makes `target/release/bundle/macos/BudsBridge.app` and a `.dmg` for
that Mac's chip. The release builds one app for both chips:

```bash
rustup target add aarch64-apple-darwin x86_64-apple-darwin
pnpm tauri build --target universal-apple-darwin
bash ../../scripts/macos-smoke.sh ../../target/universal-apple-darwin/release/bundle
```

The smoke test checks the signature, both architectures, the Info.plist and the disk image, then
starts the app in demo mode and with the real backend and takes screenshots into `smoke/`. CI runs
it on every change. The app is ad-hoc signed (`signingIdentity: "-"` in
`tauri.macos.conf.json`) and not notarized; `Info.plist` next to `tauri.conf.json` adds the
Bluetooth usage text and makes it a menu bar app.

## Release

1. Bump `version` in `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/package.json` and
   the workspace `Cargo.toml`.
2. Write the notes in `docs/releases/v<version>.md`.
3. Either tag and push (`git tag v<version> && git push origin v<version>`), or open
   **Actions → Release → Run workflow** on `main` and enter `v<version>`; that run creates the tag.

The **Release** workflow checks that the tag matches the app version, builds on Windows and on a
Mac at the same time, and publishes `BudsBridge.exe` (portable), the setup `.exe`, the universal
`BudsBridge-<version>-macos-universal.dmg` and `SHA256SUMS.txt` as the latest release. A manual
run with **dry run** ticked does everything except publishing and keeps the files as a workflow
artifact. A tag with a suffix, such as `v1.0.0-beta`, is published as a pre-release instead.

It builds in two steps, `tauri build --no-bundle` for the program and `tauri bundle` for the
installer, so that once code signing is set up the program can be signed before the installer
is built around it. Signing is off until the repository has the SignPath variable and secret;
then each release waits for two approvals in SignPath. See [`.signpath/`](../.signpath/README.md).

## README media

`scripts/record-demo.sh` (Linux: Xvfb, xdotool, ffmpeg, ImageMagick) runs the app in demo mode
on a virtual display, clicks through the main flow and writes the GIF, MP4 and screenshots to
`docs/media/`. Build first with `cd apps/desktop && pnpm tauri build --debug --no-bundle`.
Re-run it whenever the UI changes.

## Walkthrough video

`scripts/video/make.sh` builds `docs/media/tutorial.mp4` (1080 x 1350, about 30 s). It needs
`pnpm`, `ffmpeg`, and Python 3 with `kokoro-onnx`, `numpy` and `playwright`, plus Kokoro's model
files (`kokoro-v1.0.onnx`, `voices-v1.0.bin`) in `~/.cache/budsbridge-video`:

1. `narrate.py` speaks each line and writes the clips and their lengths to `target/video/voice`.
2. The stage, `apps/desktop/video.html` (`src/video/`), is the real dock on a drawn Windows 11
   style desktop. `vite.video.config.ts` swaps `lib/api` for a scripted store, and
   `src/video/scenario.ts` says what happens at each line.
3. `render.py` opens the stage in headless Chromium and moves it to every frame's instant (state,
   pointer, CSS and SVG animations) before taking a screenshot, so the result doesn't depend on
   the machine's speed. It adds the voice and encodes the MP4. `--stills 3 9` saves single frames.

To change what is said, edit `LINES` in `narrate.py`; to change what happens, edit the matching
step in `scenario.ts`.

## Layout

| Path | What |
|------|------|
| `crates/budsbridge-core` | Device model, connection state machine, reconnect policy, settings, runtime. No OS code. |
| `crates/budsbridge-win` | Windows backend: Core Audio endpoints, `KSPROPSETID_BtAudio` connect/disconnect, notifications. `examples/bt-audio.rs` is a CLI for hardware checks. |
| `crates/budsbridge-mac` | macOS backend: IOBluetooth paired devices (`src/bluetooth.m`), link open/close, polling. `src/classify.rs` holds the rules and is tested on every OS; `examples/bt-audio.rs` is its CLI. |
| `apps/desktop/src-tauri` | Tauri shell: window, tray, global hotkey, autostart, commands. |
| `apps/desktop/src` | React UI. |
| `scripts/` | `record-demo.sh` for the README media, `video/` for the walkthrough video, `macos-smoke.sh` for the Mac build. |
| `docs/` | Feasibility, architecture, hardware checklist, release notes, media. |
