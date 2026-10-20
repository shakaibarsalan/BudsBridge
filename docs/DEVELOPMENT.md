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
3. Tag and push: `git tag v<version> && git push origin v<version>`.

The **Release** workflow checks that the tag matches the app version, builds on Windows and
publishes `BudsBridge.exe` (portable), the setup `.exe` and `SHA256SUMS.txt`. 0.x releases are
marked as pre-releases until the hardware checklist passes.

## README media

`scripts/record-demo.sh` (Linux: Xvfb, xdotool, ffmpeg, ImageMagick) runs the app in demo mode
on a virtual display, clicks through the main flow and writes the GIF, MP4 and screenshots to
`docs/media/`. Build first with `cd apps/desktop && pnpm tauri build --debug --no-bundle`.
Re-run it whenever the UI changes.

## Layout

| Path | What |
|------|------|
| `crates/budsbridge-core` | Device model, connection state machine, reconnect policy, settings, runtime. No OS code. |
| `crates/budsbridge-win` | Windows backend: Core Audio endpoints, `KSPROPSETID_BtAudio` connect/disconnect, notifications. `examples/bt-audio.rs` is a CLI for hardware checks. |
| `apps/desktop/src-tauri` | Tauri shell: window, tray, global hotkey, autostart, commands. |
| `apps/desktop/src` | React UI. |
| `scripts/` | `record-demo.sh` for the README media. |
| `docs/` | Feasibility, architecture, hardware checklist, release notes, media. |
