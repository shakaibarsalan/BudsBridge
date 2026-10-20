# Hardware testing checklist

CI has no Bluetooth, so real-device behaviour is checked by hand on a
Windows 11 laptop. Fill in the results table at the end and share it (or
open an issue). It decides what we fix before calling the MVP done.

## 0. Setup

- Pair your buds with the laptop in **Settings → Bluetooth & devices** (once).
- Either download the installer from the latest CI run
  (*Actions → CI → BudsBridge-windows-installer*) or build from source
  (see [DEVELOPMENT.md](DEVELOPMENT.md)).
- Logs: `%LOCALAPPDATA%\io.github.shakaibarsalan.budsbridge\logs`

## 1. Spikes S1–S2: the Windows backend on its own

Run from the repository root (requires Rust):

```powershell
cargo run -p budsbridge-win --example bt-audio -- list
```

| Step | Command | Expected |
|------|---------|----------|
| S1a | `list` | Your buds appear once, with `[Stereo, HandsFree]`, connected or not |
| S1b | `disconnect "<id from list>"` while connected | `done in X s` |
| S1c | `connect "<id>"` while disconnected and out of the case | `done in X s` |
| S1d | `watch`, then connect/disconnect from Windows Settings | A `--- change` block per change |
| S2 | Connect the buds to your **phone**, then `connect "<id>"` on the laptop | Either times out (buds ignore the laptop) **or** buds jump to the laptop. Both are valid; we need to know which |

## 2. The app

| # | Check | Expected |
|---|-------|----------|
| A1 | Start BudsBridge | Window lists your buds; tray icon appears |
| A2 | Click **Connect** / **Disconnect** | Status goes *Connecting…* → *Connected* (and back) |
| A3 | Tray icon | Filled icon when connected, outline when not; tooltip names the device |
| A4 | Tray menu → click the device | Toggles it |
| A5 | `Ctrl+Alt+B` anywhere | Toggles the hotkey target (or the connected/first device) |
| A6 | Walk out of range (or turn Bluetooth on the buds off) and come back | *Reconnect attempt N scheduled* → *Reconnecting* → *Connected* |
| A7 | Disconnect manually, wait 1 min | Stays disconnected (no auto-reconnect) |
| A8 | Close the window | App keeps running in the tray; **Quit** in the tray exits |
| A9 | Turn on **Start with Windows**, sign out and in | BudsBridge starts in the tray, window hidden |
| A10 | Windows 11 light and dark mode | Mica backdrop visible; text readable in both themes |

## 3. Results

| Item | Value |
|------|-------|
| Buds model | |
| Laptop / Bluetooth adapter + driver version | |
| Windows version (`winver`) | |
| S1b disconnect time | |
| S1c connect time | |
| S2 behaviour (ignore / takeover) | |
| A1–A10 failures (number + what happened) | |
