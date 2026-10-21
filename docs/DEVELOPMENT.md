# Development

## Prerequisites

- Rust (stable) with the MSVC toolchain on Windows
- Node.js 22+ and pnpm 10 (`corepack enable`)
- Windows 11 for real devices (WebView2 is preinstalled). Linux/macOS run in
  **demo mode** with simulated devices.
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
cargo test                      # core + Windows backend helpers (any OS)
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

## Release

1. Bump `version` in `apps/desktop/src-tauri/tauri.conf.json`, `apps/desktop/package.json` and
   the workspace `Cargo.toml`.
2. Write the notes in `docs/releases/v<version>.md`.
3. Either tag and push (`git tag v<version> && git push origin v<version>`), or open
   **Actions → Release → Run workflow** on `main` and enter `v<version>`; that run creates the tag.

The **Release** workflow checks that the tag matches the app version, builds on Windows and
publishes `BudsBridge.exe` (portable), the setup `.exe` and `SHA256SUMS.txt` as the latest
release. A tag with a suffix, such as `v1.0.0-beta`, is published as a pre-release instead.

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
| `apps/desktop/src-tauri` | Tauri shell: window, tray, global hotkey, autostart, commands. |
| `apps/desktop/src` | React UI. |
| `scripts/` | `record-demo.sh` for the README media, `video/` for the walkthrough video. |
| `docs/` | Feasibility, architecture, hardware checklist, release notes, media. |
