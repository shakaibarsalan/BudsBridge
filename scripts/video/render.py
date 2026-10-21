#!/usr/bin/env python3
"""Renders the walkthrough video from the stage page.

The stage (apps/desktop/video.html, built into apps/desktop/dist-video) is
the real dock on a drawn Windows 11 style desktop, driven by a scripted
store. Headless Chromium draws it frame by frame: for every frame the page
is moved to that instant (state, pointer, animations) and screenshotted, so
the result doesn't depend on how fast the machine is. The voice from
narrate.py is laid at each line's start.

    python3 scripts/video/render.py              # docs/media/tutorial.mp4
    python3 scripts/video/render.py --stills 3 9 # PNGs of single instants

Needs Python's playwright (its own browser, or CHROMIUM pointing at one),
numpy and ffmpeg.
"""

import argparse
import functools
import http.server
import json
import math
import os
import subprocess
import threading
import wave
from pathlib import Path

import numpy as np
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
STAGE = ROOT / "apps/desktop/dist-video"
WORK = Path(os.environ.get("OUT_DIR", ROOT / "target/video"))
OUTPUT = Path(os.environ.get("OUTPUT", ROOT / "docs/media/tutorial.mp4"))
CHROMIUM = os.environ.get("CHROMIUM", "/opt/pw-browsers/chromium-1194/chrome-linux/chrome")

FPS = 30
VIEWPORT = {"width": 640, "height": 800}
SCALE = 1080 / 640  # 1080 x 1350 frames


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args) -> None:
        pass


def serve(directory: Path) -> str:
    handler = functools.partial(QuietHandler, directory=str(directory))
    server = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return f"http://127.0.0.1:{server.server_address[1]}"


def voice_track(placed: list[dict], files: dict[str, str], duration: float, path: Path) -> None:
    rate, mix = None, None
    for line in placed:
        with wave.open(files[line["id"]]) as clip:
            rate = rate or clip.getframerate()
            samples = np.frombuffer(clip.readframes(clip.getnframes()), dtype="<i2")
        if mix is None:
            mix = np.zeros(math.ceil(duration * rate) + rate, dtype=np.int32)
        start = round(line["start"] * rate)
        mix[start : start + len(samples)] += samples[: max(0, len(mix) - start)]
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        out.writeframes(np.clip(mix, -32768, 32767).astype("<i2").tobytes())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--stills", type=float, nargs="*", help="seconds to save as PNGs instead")
    args = parser.parse_args()

    if not (STAGE / "video.html").exists():
        raise SystemExit(
            "build the stage first: (cd apps/desktop && pnpm vite build --config vite.video.config.ts)"
        )
    voice = json.loads((WORK / "voice" / "lines.json").read_text())
    url = serve(STAGE)

    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(
            executable_path=CHROMIUM if Path(CHROMIUM).exists() else None,
            args=["--force-color-profile=srgb"],
        )
        page = browser.new_page(
            viewport=VIEWPORT, device_scale_factor=SCALE, color_scheme="dark"
        )
        page.goto(f"{url}/video.html")
        page.wait_for_function("window.stage !== undefined")
        plan = page.evaluate(
            "lines => window.stage.load(lines)",
            [{"id": line["id"], "text": line["text"], "dur": line["dur"]} for line in voice],
        )
        duration = plan["duration"]

        if args.stills is not None:
            out = WORK / "stills"
            out.mkdir(parents=True, exist_ok=True)
            # Seeking only goes forward, so visit the instants in order.
            for t in sorted(args.stills):
                for step in np.arange(0, t, 1 / FPS):
                    page.evaluate("t => window.stage.seek(t)", float(step))
                page.evaluate("t => window.stage.seek(t)", t)
                page.screenshot(path=str(out / f"t{t:05.2f}.png"))
                print(f"wrote {out / f't{t:05.2f}.png'}")
            browser.close()
            return

        files = {line["id"]: line["file"] for line in voice}
        voice_track(plan["lines"], files, duration, WORK / "voice.wav")
        frames = math.ceil(duration * FPS)
        OUTPUT.parent.mkdir(parents=True, exist_ok=True)
        encoder = subprocess.Popen(
            [
                "ffmpeg", "-loglevel", "error", "-y",
                "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "png", "-i", "pipe:",
                "-i", str(WORK / "voice.wav"),
                "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-pix_fmt", "yuv420p",
                # Speech at the loudness phones and social feeds expect.
                "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
                "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
                "-t", f"{frames / FPS:.3f}", "-movflags", "+faststart", str(OUTPUT),
            ],
            stdin=subprocess.PIPE,
        )
        for index in range(frames):
            page.evaluate("t => window.stage.seek(t)", index / FPS)
            encoder.stdin.write(page.screenshot(type="png"))
            if index % (FPS * 5) == 0:
                print(f"{index / FPS:5.1f}s / {duration:.1f}s")
        encoder.stdin.close()
        encoder.wait()
        browser.close()
    print(f"wrote {OUTPUT} ({frames / FPS:.1f}s)")


if __name__ == "__main__":
    main()
