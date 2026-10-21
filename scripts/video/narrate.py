#!/usr/bin/env python3
"""Speaks the walkthrough's lines with Kokoro, offline.

Writes one WAV per line plus lines.json (id, subtitle, file, duration) to
OUT_DIR (default target/video/voice). record.py holds each step until its
line has been spoken, so editing a line here retimes the video.

Needs kokoro-onnx and its model files: kokoro-v1.0.onnx and voices-v1.0.bin
from https://github.com/thewh1teagle/kokoro-onnx/releases (model-files-v1.0),
in ~/.cache/budsbridge-video or wherever KOKORO_MODEL and KOKORO_VOICES point.
"""

import json
import os
import sys
import wave
from pathlib import Path

import numpy as np

# (step id, spoken text, subtitle). The subtitle differs only where the
# spoken form has to spell something out.
LINES = [
    (
        "tray",
        "My earbuds connect to one device at a time, so I kept switching them between my phone "
        "and my laptop. Buds Bridge fixes that, from the Windows tray.",
        "My earbuds connect to one device at a time, so I kept switching them between my phone "
        "and my laptop. BudsBridge fixes that, from the Windows tray.",
    ),
    ("open", "One click on its icon opens the dock.", None),
    (
        "picture",
        "The picture shows where your sound goes: phone, laptop, buds. "
        "Right now the buds play the laptop.",
        None,
    ),
    (
        "phone",
        "Tap Phone audio. The phone now plays through the laptop, "
        "so you hear both in the same buds, with nothing to switch.",
        None,
    ),
    ("sources", "The count shows two sources reaching your buds: phone and laptop.", None),
    (
        "release",
        "Leaving your desk? Tap Buds, and the laptop lets go, so your phone can take them.",
        None,
    ),
    (
        "hotkey",
        "Back at the laptop, Control Alt B brings them back, from any app.",
        "Back at the laptop, Ctrl+Alt+B brings them back, from any app.",
    ),
    ("reconnect", "Auto reconnect tries again if the buds drop out on their own.", None),
    (
        "devices",
        "Devices lists every pair of buds and headphones, each with its own button.",
        None,
    ),
    ("phones", "Phones lists your paired phones, with a switch to hear each one in your buds.", None),
    (
        "settings",
        "All settings opens the full window: the hotkey, auto reconnect, and start with Windows.",
        None,
    ),
    (
        "end",
        "Buds Bridge is free and open source. One download for Windows, "
        "and nothing to install on your phone.",
        "BudsBridge is free and open source. One download for Windows, "
        "and nothing to install on your phone.",
    ),
]

CACHE = Path.home() / ".cache" / "budsbridge-video"
VOICE = os.environ.get("KOKORO_VOICE", "af_heart")
SPEED = float(os.environ.get("KOKORO_SPEED", "1.0"))


def main() -> None:
    model = Path(os.environ.get("KOKORO_MODEL", CACHE / "kokoro-v1.0.onnx"))
    voices = Path(os.environ.get("KOKORO_VOICES", CACHE / "voices-v1.0.bin"))
    for path in (model, voices):
        if not path.exists():
            sys.exit(f"missing {path}; see the docstring for where to get it")

    from kokoro_onnx import Kokoro

    out = Path(os.environ.get("OUT_DIR", "target/video/voice"))
    out.mkdir(parents=True, exist_ok=True)
    tts = Kokoro(str(model), str(voices))

    entries = []
    for step, spoken, subtitle in LINES:
        samples, rate = tts.create(spoken, voice=VOICE, speed=SPEED, lang="en-us")
        pcm = (np.clip(samples, -1.0, 1.0) * 32767).astype("<i2")
        path = out / f"{step}.wav"
        with wave.open(str(path), "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(rate)
            wav.writeframes(pcm.tobytes())
        entries.append(
            {
                "id": step,
                "text": subtitle or spoken,
                "file": str(path),
                "dur": round(len(pcm) / rate, 3),
            }
        )
        print(f"{step:10} {entries[-1]['dur']:5.2f}s  {spoken}")

    (out / "lines.json").write_text(json.dumps(entries, indent=2))
    print(f"total {sum(entry['dur'] for entry in entries):.1f}s of speech")


if __name__ == "__main__":
    main()
