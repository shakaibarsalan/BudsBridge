# Hardware testing checklist

CI has no Bluetooth, so real-device behaviour is checked by hand on a
Windows 11 laptop. Fill in the results table at the end and share it (or
open an issue). It decides what we fix before calling the MVP done.

## 0. Setup

- Pair your buds with the laptop in **Settings → Bluetooth & devices** (once).
- Download `BudsBridge.exe` from [Releases](https://github.com/shakaibarsalan/BudsBridge/releases)
  and open it (no install needed), or build from source (see [DEVELOPMENT.md](DEVELOPMENT.md)).
  SmartScreen warns once because the build isn't signed: **More info → Run anyway**.
- The S1–S2 commands below need the source and Rust. If you only have the `.exe`, skip to section 2.
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
| A1 | Start BudsBridge | The dock opens beside the tray icon and lists your buds |
| D1 | Click somewhere else, then left-click the tray icon | The dock closes, then opens again next to the icon (also with the taskbar on another edge) |
| D2 | Open **Devices** in the dock | The dock grows upwards and stays on screen |
| D3 | **All settings** (or the gear) | The full window opens and the dock closes |
| A2 | Click **Connect** / **Disconnect** | Status goes *Connecting…* → *Connected* (and back) |
| A3 | Tray icon | Filled icon when connected, outline when not; tooltip names the device |
| A4 | Tray menu → click the device | Toggles it |
| A5 | `Ctrl+Alt+B` anywhere | Toggles the hotkey target (or the connected/first device) |
| A6 | Walk out of range (or turn Bluetooth on the buds off) and come back | *Reconnect attempt N scheduled* → *Reconnecting* → *Connected* |
| A7 | Disconnect manually, wait 1 min | Stays disconnected (no auto-reconnect) |
| A8 | Close the settings window | App keeps running in the tray; **Quit** (tray menu or the dock's ⋯ menu) exits |
| A9 | Turn on **Start with Windows**, sign out and in | BudsBridge starts in the tray, window hidden |
| A10 | Windows 11 light and dark mode | Mica backdrop visible; text readable in both themes |

## 3. Bridge mode: phone audio through the laptop

Pair the phone with the laptop once: Windows **Settings → Bluetooth & devices → Add device →
Bluetooth**, pick the phone, confirm the code on both. (If you use Phone Link, it may already be
paired.) Keep the buds connected to the laptop.

| # | Check | Expected |
|---|-------|----------|
| B1 | Open BudsBridge | The phone appears under **Phone audio**, switched off |
| B2 | Switch on **Hear … in my buds** | *Connecting to the phone…* then *Playing phone audio*. On the phone, the laptop shows as a connected audio device |
| B3 | Play music on the phone **and** a YouTube video on the laptop | Both play in the buds at once. Note any stutter or dropouts |
| B4 | Clap or tap on the phone's screen while a video plays on it | Rough delay between the phone and the buds (expect 0.2–0.4 s) |
| B5 | Turn the phone's Bluetooth off for 30 s, then on | *Waiting for the phone (retrying)*, then back to *Playing* within about a minute |
| B6 | Quit BudsBridge from the tray and open it again | Phone audio comes back on by itself |
| B7 | Switch it off | The phone goes back to playing on its own speaker |
| B8 | (Optional) Call the phone with Phone Link running on the laptop | The call can be answered on the laptop and heard in the buds |

If B2 stays on *Waiting*, open the phone's Bluetooth settings, tap the laptop, and make sure
**Media audio** is allowed for it.

If the phone is missing, or listed with *Windows doesn't offer its audio*, open settings →
**Troubleshooting → Copy diagnostics** and paste the text into your results. It shows which
Bluetooth services Windows set up for each paired phone.

## 4. Results

| Item | Value |
|------|-------|
| Buds model | |
| Laptop / Bluetooth adapter + driver version | |
| Windows version (`winver`) | |
| S1b disconnect time | |
| S1c connect time | |
| S2 behaviour (ignore / takeover) | |
| A1–A10 failures (number + what happened) | |
| Phone model / Android version | |
| B3: both at once, any stutter? | |
| B4: rough delay | |
| B1–B8 failures (number + what happened) | |
| Diagnostics text, if a phone didn't work | |

## 5. On a Mac

CI builds the Mac app, checks its signature and starts it on GitHub's Mac machines, which have no
Bluetooth. These steps check it with real buds. Use macOS 12 or later.

**Setup**

- Pair the buds in **System Settings → Bluetooth** (once).
- Download `BudsBridge-<version>-macos-universal.dmg` from
  [Releases](https://github.com/shakaibarsalan/BudsBridge/releases), drag BudsBridge into
  Applications and open it. The first time macOS says it can't verify it: on macOS 15+ go to
  **System Settings → Privacy & Security → Open Anyway**; on 12–14 Control-click the app → **Open**.
- Allow Bluetooth when macOS asks.
- Logs: `~/Library/Logs/io.github.shakaibarsalan.budsbridge`

**Backend on its own** (needs the source, Rust and the Xcode Command Line Tools; run it from
Terminal, which macOS asks about Bluetooth once):

```bash
cargo run -p budsbridge-mac --example bt-audio -- list
cargo run -p budsbridge-mac --example bt-audio -- disconnect <address from list>
cargo run -p budsbridge-mac --example bt-audio -- connect <address>
cargo run -p budsbridge-mac --example bt-audio -- diagnostics
```

| # | Step | Expected |
|---|------|----------|
| M1 | `list` | Your buds appear once, with their profiles, connected or not; phones and keyboards don't |
| M2 | `disconnect` while connected | `done after X s`; macOS moves the sound back to the Mac's speakers |
| M3 | `connect` while disconnected and out of the case | `done after X s`; the sound moves to the buds by itself |
| M4 | Open the app | A buds icon in the menu bar, no Dock icon; clicking it opens the dock under it |
| M5 | Buds tile, power button, Devices list, menu bar right-click | Each connects and releases the buds; the states move through *Connecting…* |
| M6 | `⌃⌥B` from another app | Toggles the buds |
| M7 | Close the case while connected | Auto-reconnect retries; opening the case brings them back |
| M8 | Buds connected to your phone, then connect from the Mac | Times out (buds ignore the Mac) **or** they jump to the Mac; note which |
| M9 | Turn Bluetooth off, then click Connect | A clear "Bluetooth is off" message |
| M10 | **Open at login** on, log out and in | BudsBridge starts in the menu bar without opening the dock |
| M11 | Phones in the dock | The AirPlay steps; paired phones listed as *Can't play through a Mac over Bluetooth* |
| M12 | AirPlay from an iPhone to the Mac | The iPhone plays in the buds with the Mac's sound |
| M13 | Open the app again from Applications while it runs | The dock opens; no second copy |

| Item | Value |
|------|-------|
| Mac model, chip (Apple Silicon / Intel) | |
| macOS version | |
| Buds model | |
| M2 / M3 times | |
| M8 behaviour (ignore / takeover) | |
| M1–M13 failures (number + what happened) | |
| Diagnostics text, if something didn't work | |
