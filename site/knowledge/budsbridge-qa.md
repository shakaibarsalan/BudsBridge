# BudsBridge: questions and answers

Facts for the BudsBridge help agent. Source: the BudsBridge README, docs and release notes (v0.3.6, 21 October 2026), and the v0.4.0 release, which adds the Mac version.
Website: https://budsbridge.vercel.app. Downloads: https://budsbridge.vercel.app/download/ or https://github.com/shakaibarsalan/BudsBridge/releases/latest

## What is BudsBridge?
BudsBridge is a free, open-source app that keeps your Bluetooth buds connected to your computer and switches them with one click or a hotkey. It is a tray app for Windows 11 and, from version 0.4.0, a menu bar app for macOS 12 Monterey or later. On Windows it also lets you hear your phone and your laptop in the same Bluetooth buds, even buds without multipoint: the buds stay connected to the laptop, and the phone plays its audio through the laptop into the same buds, so you hear both and never switch. On a Mac, an iPhone or iPad can play through the Mac with AirPlay instead.

## How does it work?
On Windows, the phone connects to the laptop over Bluetooth as if the laptop were a Bluetooth speaker. Windows mixes the phone's audio with the laptop's own sound (YouTube, Zoom and so on) into your buds. This is called bridge mode, and in the app it is the Phone audio tile. Bridge mode is Windows only (see "Does phone audio work on a Mac?").

## Do my buds need multipoint?
No. BudsBridge is made for buds that hold one connection at a time. Multipoint is a feature of the buds' firmware, and no app on Windows or Android can add it, so BudsBridge gets the same result by routing the phone through the laptop.

## How do I set it up on Windows?
1. Pair your buds with the laptop in Settings → Bluetooth & devices. For phone audio, pair your phone with the laptop there too.
2. Open BudsBridge and click its icon in the tray. The dock shows what is connected.
3. Click the Phone audio tile ("Hear my phone in my buds"). After "Connecting…" the link turns green, the headline says "Hearing phone + laptop" and the count shows 2 sources.

## Do I need an app on my phone?
No. Nothing is installed on the phone. On Windows the phone just sees the laptop as a Bluetooth speaker. On a Mac, an iPhone or iPad uses AirPlay, which is built in.

## Which phones work?
On Windows, any phone that can play to a Bluetooth speaker. It has been tested with two Android phones at once (OPPO A83 and Pixel 7). iPhone should work the same way because it is plain Bluetooth audio, but it has not been tested yet. On a Mac, an iPhone or iPad can play through AirPlay; Android phones can't play through a Mac yet.

## Can two phones play at the same time?
On Windows, yes. Two phones playing at once was tested (OPPO A83 and Pixel 7), and the dock counts and names each phone that plays.

## How do I move the buds to my phone when I leave the laptop?
Press Ctrl+Alt+B (Control+Option+B, written ⌃⌥B, on a Mac), click the Buds tile or the power button in the dock, or use the tray menu. That releases the buds so your phone can connect to them. Press it again when you come back and the buds connect to the laptop again.

## Can it switch the buds back to the phone automatically?
Not fully. Moving the buds from the laptop to the phone is done with one click or the hotkey. Making an Android phone grab the buds by itself isn't possible from a normal Android app, because Android has no public API to connect a specific headset. Bridge mode removes most of the need to switch.

## What is the hotkey and can I change it?
Ctrl+Alt+B on Windows and Control+Option+B (⌃⌥B) on a Mac toggle your buds from any app. On Windows, pick which buds with "Hotkey target", change the key combination in Settings, or leave the field empty to turn the hotkey off.

## Does phone audio stay on?
Yes. Phone audio over Bluetooth is a Windows feature. Once turned on it stays on. If the phone goes away it waits and reconnects after 5 s, 10 s, 20 s, 40 s, then every minute, and it turns itself back on after a restart.

## What happens if my buds drop?
If the buds drop unexpectedly (out of range, case closed), BudsBridge retries after 1 s, 2 s, 4 s and so on up to 30 s, eight times. It never retries after you disconnect them yourself, so the laptop doesn't fight your phone for the buds.

## Connecting takes forever / nothing happens.
The state moves through "Connecting…" to "Connected". If the buds don't answer within 15 seconds, BudsBridge shows a clear message instead of a spinner. Make sure the buds are out of the case, not connected to the phone, and paired with the laptop in Bluetooth & devices.

## What does the tray icon show?
On Windows: a filled icon while buds are connected and an outline when not, with a tooltip naming what is connected. Left-click opens the dock; right-click opens a menu to toggle each device and phone, switch auto-reconnect, open settings or quit. On a Mac, the menu bar icon opens the same dock.

## Does it start with Windows?
It can. With "Start with Windows" on, it starts minimized to the tray, ready for the hotkey. On a Mac, the matching setting is Open at login.

## Which systems are supported?
Windows 11, 64-bit, and, from version 0.4.0, macOS 12 Monterey or later on Apple Silicon and Intel Macs. Windows 10 and Linux are not supported. Windows 11 already includes the WebView2 runtime the app uses, so nothing else needs installing.

## Does it work on Mac?
Yes, from version 0.4.0, on macOS 12 Monterey or later. It is one universal app for Apple Silicon and Intel Macs. The Mac version is new in 0.4.0: it is built and launched on GitHub's Mac machines but not yet tested with real buds on a real Mac, so reports on GitHub issues are welcome.

## What does the Mac version do?
A menu bar icon opens the same dock panel as on Windows. It lists your paired Bluetooth buds and headphones, connects or disconnects them with one click, and Control+Option+B (⌃⌥B) toggles the buds from any app. It reconnects after drops, has an Open at login setting, and light and dark follow the system. It lives in the menu bar; there is no Dock icon.

## How do I install it on a Mac?
1. Download BudsBridge-<version>-macos-universal.dmg, open it and drag BudsBridge into Applications.
2. Open BudsBridge. The app is not notarized by Apple yet (that needs a paid Apple Developer ID), so the first time macOS says it can't verify the app. See "macOS says it can't verify BudsBridge".
3. macOS asks whether BudsBridge may use Bluetooth. Click Allow: the app needs Bluetooth to see and connect the buds.
4. Click the BudsBridge icon in the menu bar to open the dock.

## macOS says it can't verify BudsBridge, or that it was not opened.
The Mac app isn't notarized by Apple yet, so macOS warns the first time it opens.
- macOS 15 Sequoia and later: click Done, open System Settings → Privacy & Security, scroll down, click Open Anyway next to BudsBridge and confirm with your password or Touch ID.
- macOS 12 to 14: Control-click (right-click) BudsBridge in Applications, choose Open, then Open again.

## Why does BudsBridge ask for Bluetooth on a Mac?
It needs Bluetooth permission to see and connect your buds. Click Allow when macOS asks.

## I can't find BudsBridge on my Mac after opening it.
It lives in the menu bar at the top of the screen, not in the Dock. There is no Dock icon.

## Does phone audio work on a Mac?
Not over Bluetooth. macOS doesn't let a Mac act as a Bluetooth speaker for a phone (Apple doesn't support receiving phone audio over Bluetooth), so Bluetooth phone audio (bridge mode: phone → computer → buds) is Windows only.

## Can my iPhone play through my Mac?
Yes, with AirPlay, on macOS 12 or later. Turn on AirPlay Receiver in System Settings → General → AirDrop & Handoff, then AirPlay from the iPhone or iPad to the Mac. The phone's audio plays in your buds, mixed with the Mac's own sound.

## Can my Android phone play through my Mac?
Not yet. A USB or Wi-Fi option is planned.

## Which file should I download?
On Windows:
- BudsBridge-<version>-windows-x64-setup.exe: an installer for your user only, with a Start menu entry and an uninstaller, and no admin prompt. Recommended.
- BudsBridge.exe: a single file with no installer. Download it and open it.
The installer is about 1.4 MB and the single .exe about 4 MB.
On a Mac (from version 0.4.0):
- BudsBridge-<version>-macos-universal.dmg: one app for Apple Silicon and Intel Macs.
For all of them:
- SHA256SUMS.txt: checksums for every file in the release.
Releases before 0.4.0 have no Mac file.

## Windows says "Windows protected your PC". Is it safe?
The build isn't code-signed yet, so Microsoft Defender SmartScreen warns the first time. Click "More info", then "Run anyway". The source code is public on GitHub and every release has SHA-256 checksums. Free code signing from SignPath Foundation is under review.

## Windows blocks it and there is no "Run anyway" button.
That is Smart App Control. It blocks unsigned apps outright and offers no way past it. Once signed builds ship, BudsBridge will open normally. Until then you can build it yourself from the source code. Turning Smart App Control off can't be undone without resetting Windows, so think twice before doing that.

## How do I check the download?
On Windows, in PowerShell, run Get-FileHash .\BudsBridge.exe -Algorithm SHA256 (or the installer's file name). On a Mac, in Terminal, run shasum -a 256 followed by the path to the .dmg. Compare the result with SHA256SUMS.txt on the release.

## How do I update?
Download the new version. On Windows, opening a newer BudsBridge.exe while an older copy (0.3.1 or later) runs in the tray hands over to the new one by itself. For older copies, quit them from the tray first.

## Is there a delay on the phone's sound?
With Bluetooth phone audio on Windows, some delay is likely, because the phone's sound makes two Bluetooth hops: phone to laptop, then laptop to buds. It hasn't been measured yet; the hardware checklist on GitHub tracks it.

## Is BudsBridge free? Does it collect data?
Yes, it is free and open source under the MIT license. There is no account, no ads and no tracking. Everything runs on your own computer.

## Where are the settings and logs?
On Windows:
Settings: %APPDATA%\io.github.shakaibarsalan.budsbridge\settings.json
Logs: %LOCALAPPDATA%\io.github.shakaibarsalan.budsbridge\logs
Attach the logs when reporting a problem.

## How do I report a problem or ask for a feature?
Open an issue on GitHub: https://github.com/shakaibarsalan/BudsBridge/issues. Include your Windows or macOS version, your buds and phone models, and the logs.

## Can I build it myself?
Yes, on Windows 11 with Rust (stable, MSVC), Node.js 22+ and pnpm 10: clone the repository, go to apps/desktop, run pnpm install, then pnpm tauri dev to run it or pnpm tauri build to build it.

## What's coming next?
Planned: code signing (application under review), phone audio over USB or Wi-Fi ADB (audio only), an audio sources panel with per-source volume and a latency indicator, and priority and ducking between laptop and phone audio.

## Who makes BudsBridge?
Muhammad Shakaib Arsalan, as an open-source project on GitHub.
