# BudsBridge: questions and answers

Facts for the BudsBridge help agent. Source: the BudsBridge README, docs and release notes (v0.3.6, 21 October 2026).
Website: https://budsbridge.vercel.app. Downloads: https://budsbridge.vercel.app/download/ or https://github.com/shakaibarsalan/BudsBridge/releases/latest

## What is BudsBridge?
BudsBridge is a free, open-source tray app for Windows 11. It lets you hear your phone and your laptop in the same Bluetooth buds, even buds without multipoint. The buds stay connected to the laptop, and the phone plays its audio through the laptop into the same buds, so you hear both and never switch.

## How does it work?
The phone connects to the laptop over Bluetooth as if the laptop were a Bluetooth speaker. Windows mixes the phone's audio with the laptop's own sound (YouTube, Zoom and so on) into your buds. This is called bridge mode, and in the app it is the Phone audio tile.

## Do my buds need multipoint?
No. BudsBridge is made for buds that hold one connection at a time. Multipoint is a feature of the buds' firmware, and no app on Windows or Android can add it, so BudsBridge gets the same result by routing the phone through the laptop.

## How do I set it up?
1. Pair your buds with the laptop in Settings → Bluetooth & devices. For phone audio, pair your phone with the laptop there too.
2. Open BudsBridge and click its icon in the tray. The dock shows what is connected.
3. Click the Phone audio tile ("Hear my phone in my buds"). After "Connecting…" the link turns green, the headline says "Hearing phone + laptop" and the count shows 2 sources.

## Do I need an app on my phone?
No. Nothing is installed on the phone. The phone just sees the laptop as a Bluetooth speaker.

## Which phones work?
Any phone that can play to a Bluetooth speaker. It has been tested with two Android phones at once (OPPO A83 and Pixel 7). iPhone should work the same way because it is plain Bluetooth audio, but it has not been tested yet.

## Can two phones play at the same time?
Yes. Two phones playing at once was tested (OPPO A83 and Pixel 7), and the dock counts and names each phone that plays.

## How do I move the buds to my phone when I leave the laptop?
Press Ctrl+Alt+B, click the Buds tile or the power button in the dock, or use the tray menu. That releases the buds so your phone can connect to them. Press it again when you come back and the buds connect to the laptop again.

## Can it switch the buds back to the phone automatically?
Not fully. Moving the buds from the laptop to the phone is done with one click or the hotkey. Making an Android phone grab the buds by itself isn't possible from a normal Android app, because Android has no public API to connect a specific headset. Bridge mode removes most of the need to switch.

## What is the hotkey and can I change it?
Ctrl+Alt+B toggles your chosen buds from any app. Pick which buds with "Hotkey target", change the key combination in Settings, or leave the field empty to turn the hotkey off.

## Does phone audio stay on?
Yes. Once turned on it stays on. If the phone goes away it waits and reconnects after 5 s, 10 s, 20 s, 40 s, then every minute, and it turns itself back on after a restart.

## What happens if my buds drop?
If the buds drop unexpectedly (out of range, case closed), BudsBridge retries after 1 s, 2 s, 4 s and so on up to 30 s, eight times. It never retries after you disconnect them yourself, so the laptop doesn't fight your phone for the buds.

## Connecting takes forever / nothing happens.
The state moves through "Connecting…" to "Connected". If the buds don't answer within 15 seconds, BudsBridge shows a clear message instead of a spinner. Make sure the buds are out of the case, not connected to the phone, and paired with the laptop in Bluetooth & devices.

## What does the tray icon show?
A filled icon while buds are connected and an outline when not, with a tooltip naming what is connected. Left-click opens the dock; right-click opens a menu to toggle each device and phone, switch auto-reconnect, open settings or quit.

## Does it start with Windows?
It can. With "Start with Windows" on, it starts minimized to the tray, ready for the hotkey.

## Which Windows versions are supported?
Windows 11, 64-bit, only. Windows 10, macOS and Linux are not supported. Windows 11 already includes the WebView2 runtime the app uses, so nothing else needs installing.

## Which file should I download?
- BudsBridge-<version>-windows-x64-setup.exe: an installer for your user only, with a Start menu entry and an uninstaller, and no admin prompt. Recommended.
- BudsBridge.exe: a single file with no installer. Download it and open it.
- SHA256SUMS.txt: checksums for both files.
The installer is about 1.4 MB and the single .exe about 4 MB.

## Windows says "Windows protected your PC". Is it safe?
The build isn't code-signed yet, so Microsoft Defender SmartScreen warns the first time. Click "More info", then "Run anyway". The source code is public on GitHub and every release has SHA-256 checksums. Free code signing from SignPath Foundation is under review.

## Windows blocks it and there is no "Run anyway" button.
That is Smart App Control. It blocks unsigned apps outright and offers no way past it. Once signed builds ship, BudsBridge will open normally. Until then you can build it yourself from the source code. Turning Smart App Control off can't be undone without resetting Windows, so think twice before doing that.

## How do I check the download?
In PowerShell, run Get-FileHash .\BudsBridge.exe -Algorithm SHA256 (or the installer's file name) and compare it with SHA256SUMS.txt on the release.

## How do I update?
Download the new version. Opening a newer BudsBridge.exe while an older copy (0.3.1 or later) runs in the tray hands over to the new one by itself. For older copies, quit them from the tray first.

## Is there a delay on the phone's sound?
Some delay is likely, because the phone's sound makes two Bluetooth hops: phone to laptop, then laptop to buds. It hasn't been measured yet; the hardware checklist on GitHub tracks it.

## Is BudsBridge free? Does it collect data?
Yes, it is free and open source under the MIT license. There is no account, no ads and no tracking. Everything runs on your own computer.

## Where are the settings and logs?
Settings: %APPDATA%\io.github.shakaibarsalan.budsbridge\settings.json
Logs: %LOCALAPPDATA%\io.github.shakaibarsalan.budsbridge\logs
Attach the logs when reporting a problem.

## How do I report a problem or ask for a feature?
Open an issue on GitHub: https://github.com/shakaibarsalan/BudsBridge/issues. Include your Windows version, your buds and phone models, and the logs.

## Can I build it myself?
Yes, on Windows 11 with Rust (stable, MSVC), Node.js 22+ and pnpm 10: clone the repository, go to apps/desktop, run pnpm install, then pnpm tauri dev to run it or pnpm tauri build to build it.

## What's coming next?
Planned: code signing (application under review), phone audio over USB or Wi-Fi ADB (audio only), an audio sources panel with per-source volume and a latency indicator, and priority and ducking between laptop and phone audio.

## Who makes BudsBridge?
Muhammad Shakaib Arsalan, as an open-source project on GitHub.
