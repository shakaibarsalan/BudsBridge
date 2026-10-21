#!/usr/bin/env python3
"""Speaks the walkthrough's lines with Kokoro, offline.

Writes one WAV per line plus lines.json (id, subtitle, file, duration) to
OUT_DIR (default target/video/voice). The stage holds each step until its
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
# spoken form has to spell something out; words between asterisks are
# highlighted on screen. The ids match the steps in
# apps/desktop/src/video/scenario.ts.
LINES = [
    (
        "hook",
        "My earbuds connect to one device at a time. My phone, or my laptop. Never both.",
        "My earbuds connect to *one device* at a time. Phone or laptop, never both.",
    ),
    (
        "open",
        "So I built Buds Bridge. It lives in the Windows tray.",
        "So I built *BudsBridge*. It lives in the Windows tray.",
    ),
    (
        "phone",
        "Tap Phone audio, and my phone plays through the laptop, into the same buds.",
        "Tap *Phone audio*: my phone plays through the laptop, into the same buds.",
    ),
    (
        "second",
        "A second phone can join as well. Now I hear both phones and the laptop, together.",
        "A second phone can join too. Now I hear *both phones and the laptop*, together.",
    ),
    (
        "handover",
        "Leaving my desk? One tap frees the buds for my phone.",
        "Leaving my desk? *One tap* frees the buds for my phone.",
    ),
    (
        "hotkey",
        "Back at the laptop, Control Alt B brings them back.",
        "Back at the laptop, *Ctrl+Alt+B* brings them back.",
    ),
    (
        "end",
        "Buds Bridge. Free and open source, for Windows.",
        "*BudsBridge*. Free and open source, for Windows.",
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
