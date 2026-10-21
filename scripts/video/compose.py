#!/usr/bin/env python3
"""Builds the walkthrough video from record.py's recording and timeline.

Each frame is the recorded desktop scaled into the top of a 1080 x 1350
frame, with a drawn taskbar under it and the subtitle strip at the bottom.
On top go the pointer, click ripples, pulsing attention rings and key
badges from the timeline. The narration is laid at each line's start.

Writes OUTPUT (default docs/media/tutorial.mp4). Needs ffmpeg, Pillow, numpy.
"""

import json
import math
import os
import subprocess
import sys
import wave
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from layout import (  # noqa: E402
    DESKTOP_H,
    FPS,
    FRAME_H,
    FRAME_W,
    SCREEN_H,
    SCREEN_W,
    STRIP_H,
    STRIP_Y,
    TASKBAR_H,
    TASKBAR_Y,
    TRAY_ICON,
    K,
    camera_height,
)

ROOT = Path(__file__).resolve().parents[2]
WORK = Path(os.environ.get("OUT_DIR", ROOT / "target/video"))
OUTPUT = Path(os.environ.get("OUTPUT", ROOT / "docs/media/tutorial.mp4"))

RING = (255, 138, 61)  # warm orange, apart from every colour the dock uses
STRIP_BG = (13, 15, 20)
TEXT = (241, 238, 231)


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = subprocess.run(
        ["fc-match", "-f", "%{file}", name], capture_output=True, text=True, check=True
    ).stdout
    return ImageFont.truetype(path, size)


# Static layers.


def cursor_sprite() -> Image.Image:
    """A Windows-style arrow, 1.6x, with a soft shadow. Hotspot at (8, 8)."""
    scale = 1.6
    points = [(0, 0), (0, 21), (5, 16.2), (8.6, 24), (11.6, 22.7), (8.1, 15.2), (15, 15.2)]
    points = [(8 + x * scale, 8 + y * scale) for x, y in points]
    size = (48, 56)
    shadow = Image.new("RGBA", size)
    ImageDraw.Draw(shadow).polygon([(x + 1.5, y + 2.5) for x, y in points], fill=(0, 0, 0, 110))
    shadow = shadow.filter(ImageFilter.GaussianBlur(2.2))
    arrow = Image.new("RGBA", size)
    draw = ImageDraw.Draw(arrow)
    draw.polygon(points, fill=(255, 255, 255, 255), outline=(0, 0, 0, 255), width=2)
    return Image.alpha_composite(shadow, arrow)


def taskbar(icon_state: str) -> Image.Image:
    bar = Image.new("RGBA", (FRAME_W, TASKBAR_H), (27, 30, 38, 255))
    draw = ImageDraw.Draw(bar)
    draw.line([(0, 0), (FRAME_W, 0)], fill=(52, 58, 72), width=1)
    cy = TASKBAR_H // 2
    glyph = (226, 230, 238)

    # Hidden icons chevron.
    x = TRAY_ICON[0] - 44
    draw.line([(x - 6, cy + 3), (x, cy - 3), (x + 6, cy + 3)], fill=glyph, width=2)

    # BudsBridge's own icon, as the tray shows it.
    name = "tray-connected.png" if icon_state == "connected" else "tray-idle.png"
    icon = Image.open(ROOT / "apps/desktop/src-tauri/icons" / name).convert("RGBA")
    icon = icon.resize((30, 30), Image.LANCZOS)
    bar.alpha_composite(icon, (TRAY_ICON[0] - 15, cy - 15))

    # Wi-Fi and volume, as plain glyphs.
    x = TRAY_ICON[0] + 44
    for radius in (4, 9, 14):
        draw.arc((x - radius, cy + 6 - radius, x + radius, cy + 6 + radius), 225, 315, fill=glyph, width=2)
    x += 36
    draw.polygon([(x - 8, cy - 4), (x - 3, cy - 4), (x + 3, cy - 9), (x + 3, cy + 9), (x - 3, cy + 4), (x - 8, cy + 4)], fill=glyph)
    draw.arc((x - 2, cy - 7, x + 10, cy + 7), 300, 60, fill=glyph, width=2)

    clock = font("Inter:medium", 17)
    for text, y in (("10:24 AM", cy - 19), ("10/21/2026", cy + 1)):
        width = draw.textlength(text, font=clock)
        draw.text((FRAME_W - 22 - width, y), text, font=clock, fill=glyph)
    return bar


def wrap(text: str, typeface: ImageFont.FreeTypeFont, width: int) -> list[str]:
    lines, current = [], ""
    for word in text.split():
        trial = f"{current} {word}".strip()
        if typeface.getlength(trial) <= width or not current:
            current = trial
        else:
            lines.append(current)
            current = word
    return lines + [current]


def subtitle(text: str) -> Image.Image:
    image = Image.new("RGBA", (FRAME_W, STRIP_H))
    for size in (30, 27, 24):
        typeface = font("Inter:medium", size)
        lines = wrap(text, typeface, FRAME_W - 90)
        if len(lines) <= 2:
            break
    draw = ImageDraw.Draw(image)
    line_height = round(size * 1.32)
    y = (STRIP_H - line_height * len(lines)) / 2
    for line in lines:
        width = draw.textlength(line, font=typeface)
        draw.text(((FRAME_W - width) / 2, y), line, font=typeface, fill=TEXT)
        y += line_height
    return image


BADGE_H = 48


def key_badges(labels: list[str]) -> Image.Image:
    typeface = font("Inter:semibold", 24)
    caps = []
    for label in labels:
        width = round(typeface.getlength(label)) + 36
        cap = Image.new("RGBA", (width, BADGE_H))
        draw = ImageDraw.Draw(cap)
        draw.rounded_rectangle(
            (0, 0, width - 1, BADGE_H - 1), 12,
            fill=(50, 54, 64, 255), outline=(255, 255, 255, 60), width=2,
        )
        draw.line([(12, 2), (width - 13, 2)], fill=(255, 255, 255, 40), width=1)
        draw.text((18, 10), label, font=typeface, fill=(244, 241, 234))
        caps.append(cap)
    gap = 10
    plus = font("Inter:semibold", 22)
    total = sum(cap.width for cap in caps) + (len(caps) - 1) * (gap * 2 + 12)
    image = Image.new("RGBA", (total, BADGE_H))
    draw = ImageDraw.Draw(image)
    x = 0
    for i, cap in enumerate(caps):
        image.alpha_composite(cap, (x, 0))
        x += cap.width
        if i < len(caps) - 1:
            draw.text((x + gap, 10), "+", font=plus, fill=(244, 241, 234, 200))
            x += gap * 2 + 12
    return image


def with_alpha(image: Image.Image, alpha: float) -> Image.Image:
    if alpha >= 1:
        return image
    faded = image.copy()
    faded.putalpha(image.getchannel("A").point(lambda a: round(a * max(alpha, 0))))
    return faded


# The timeline.


class Track:
    def __init__(self, timeline: dict) -> None:
        events = timeline["events"]
        self.cursor = [(e["t"], e["x"], e["y"]) for e in events if e["type"] == "cursor"]
        self.clicks = [(e["t"], e["x"], e["y"]) for e in events if e["type"] == "click"]
        self.rings = [(e["t"], e["until"], e["box"]) for e in events if e["type"] == "ring"]
        self.keys = [(e["t"], e["until"], e["labels"]) for e in events if e["type"] == "keys"]
        self.tray = [(e["t"], e["state"]) for e in events if e["type"] == "tray"]
        self.lines = [e for e in events if e["type"] == "line"]
        self.cameras = [(e["t"], e["width"], e["ease"]) for e in events if e["type"] == "camera"]
        self.duration = timeline["duration"]

    def cursor_at(self, t: float) -> tuple[float, float]:
        previous = self.cursor[0]
        for point in self.cursor:
            if point[0] > t:
                span = point[0] - previous[0]
                p = 0 if span <= 0 else (t - previous[0]) / span
                return (previous[1] + (point[1] - previous[1]) * p,
                        previous[2] + (point[2] - previous[2]) * p)
            previous = point
        return previous[1], previous[2]

    def tray_state(self, t: float) -> str:
        state = "connected"
        for at, value in self.tray:
            if at <= t:
                state = value
        return state

    def subtitle_at(self, t: float) -> tuple[int, float] | None:
        """Index of the line shown at `t` and its opacity."""
        for i, line in enumerate(self.lines):
            following = self.lines[i + 1]["start"] - 0.2 if i + 1 < len(self.lines) else self.duration
            end = min(line["end"] + 0.9, following)
            if line["start"] <= t < end:
                fade = min((t - line["start"]) / 0.15, (end - t) / 0.15, 1)
                return i, fade
        return None


class Camera:
    """The part of the display shown, eased between the timeline's views.
    Always anchored to the bottom-right corner, next to the tray."""

    def __init__(self, track: Track) -> None:
        self.views = list(track.cameras)
        self.width = float(SCREEN_W)
        self.move = (0.0, 1.0, self.width, self.width)  # start, seconds, from, to

    def update(self, t: float) -> None:
        while self.views and self.views[0][0] <= t:
            at, width, ease = self.views.pop(0)
            self.move = (at, ease, self.width, width)
        start, seconds, begin, end = self.move
        p = 1.0 if seconds <= 0 else min(max((t - start) / seconds, 0.0), 1.0)
        e = 4 * p**3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2
        self.width = begin + (end - begin) * e

    def box(self) -> tuple[float, float, float, float]:
        height = camera_height(self.width)
        return SCREEN_W - self.width, SCREEN_H - height, SCREEN_W, SCREEN_H

    def point(self, x: float, y: float) -> tuple[float, float]:
        """A timeline point (frame pixels at the full view) as seen now. The
        drawn taskbar below the desktop doesn't zoom."""
        if y >= DESKTOP_H:
            return x, y
        sx, sy = x / K, y / K
        left, top, _, _ = self.box()
        zoom = FRAME_W / self.width
        return (sx - left) * zoom, (sy - top) * zoom

    def scale(self) -> float:
        return SCREEN_W / self.width


def draw_overlays(frame: Image.Image, track: Track, t: float, sprites: dict, camera: Camera) -> None:
    layer = Image.new("RGBA", frame.size)
    draw = ImageDraw.Draw(layer)

    for start, until, box in track.rings:
        if start <= t < until:
            age = t - start
            fade = min(age / 0.2, (until - t) / 0.25, 1)
            pulse = (1 - math.cos(age / 0.9 * 2 * math.pi)) / 2  # 0 → 1 → 0 every 0.9 s
            opacity = (1 - 0.65 * pulse) * fade
            grow = 1 + 0.06 * pulse
            x, y, w, h = box
            cx, cy = camera.point(x + w / 2, y + h / 2)
            zoom = camera.scale() if y < DESKTOP_H else 1
            hw, hh = (w * zoom / 2 + 8) * grow, (h * zoom / 2 + 8) * grow
            draw.rounded_rectangle(
                (cx - hw, cy - hh, cx + hw, cy + hh), 14,
                outline=(*RING, round(255 * opacity)), width=4,
            )

    for at, x, y in track.clicks:
        age = t - at
        x, y = camera.point(x, y)
        if 0 <= age < 0.45:
            radius = 10 + 34 * (age / 0.45)
            alpha = round(200 * (1 - age / 0.45))
            draw.ellipse((x - radius, y - radius, x + radius, y + radius), outline=(255, 255, 255, alpha), width=3)

    frame.alpha_composite(layer)

    for start, until, labels in track.keys:
        if start <= t < until:
            fade = min((t - start) / 0.15, (until - t) / 0.2, 1)
            badge = sprites["keys"][tuple(labels)]
            # In the taskbar's empty left side, where it never covers the dock.
            frame.alpha_composite(
                with_alpha(badge, fade), (24, TASKBAR_Y + (TASKBAR_H - badge.height) // 2)
            )

    x, y = camera.point(*track.cursor_at(t))
    frame.alpha_composite(sprites["cursor"], (round(x) - 8, round(y) - 8))


def voice_track(track: Track, path: Path) -> None:
    rate = None
    mix = None
    for line in track.lines:
        with wave.open(line["file"]) as clip:
            rate = rate or clip.getframerate()
            samples = np.frombuffer(clip.readframes(clip.getnframes()), dtype="<i2")
        if mix is None:
            mix = np.zeros(round(track.duration * rate) + rate, dtype=np.int32)
        start = round(line["start"] * rate)
        mix[start : start + len(samples)] += samples[: max(0, len(mix) - start)]
    with wave.open(str(path), "wb") as out:
        out.setnchannels(1)
        out.setsampwidth(2)
        out.setframerate(rate)
        out.writeframes(np.clip(mix, -32768, 32767).astype("<i2").tobytes())


def main() -> None:
    timeline = json.loads((WORK / "timeline.json").read_text())
    track = Track(timeline)
    frames = math.ceil(track.duration * FPS)
    voice_track(track, WORK / "voice.wav")

    sprites = {
        "cursor": cursor_sprite(),
        "keys": {tuple(labels): key_badges(labels) for _, _, labels in track.keys},
    }
    bars = {state: taskbar(state) for state in ("connected", "idle")}
    subtitles = [subtitle(line["text"]) for line in track.lines]

    decoder = subprocess.Popen(
        [
            "ffmpeg", "-loglevel", "error", "-ss", f"{timeline['offset']:.3f}",
            "-i", str(WORK / "recording.mp4"),
            "-vf", f"fps={FPS}",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "pipe:",
        ],
        stdout=subprocess.PIPE,
    )
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    encoder = subprocess.Popen(
        [
            "ffmpeg", "-loglevel", "error", "-y",
            "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{FRAME_W}x{FRAME_H}",
            "-r", str(FPS), "-i", "pipe:", "-i", str(WORK / "voice.wav"),
            "-c:v", "libx264", "-preset", "slow", "-crf", "20", "-pix_fmt", "yuv420p",
            # Speech at the loudness phones and social feeds expect.
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
            "-c:a", "aac", "-b:a", "128k", "-ar", "48000",
            "-t", f"{frames / FPS:.3f}", "-movflags", "+faststart", str(OUTPUT),
        ],
        stdin=subprocess.PIPE,
    )

    frame_bytes = SCREEN_W * SCREEN_H * 3
    screen = None
    camera = Camera(track)
    for index in range(frames):
        t = index / FPS
        raw = decoder.stdout.read(frame_bytes)
        if len(raw) == frame_bytes:
            screen = Image.frombytes("RGB", (SCREEN_W, SCREEN_H), raw)
        camera.update(t)
        desktop = screen.resize((FRAME_W, DESKTOP_H), Image.BICUBIC, box=camera.box())
        frame = Image.new("RGBA", (FRAME_W, FRAME_H), (*STRIP_BG, 255))
        frame.paste(desktop, (0, 0))
        frame.alpha_composite(bars[track.tray_state(t)], (0, TASKBAR_Y))
        shown = track.subtitle_at(t)
        if shown:
            i, fade = shown
            frame.alpha_composite(with_alpha(subtitles[i], fade), (0, STRIP_Y))
        draw_overlays(frame, track, t, sprites, camera)
        encoder.stdin.write(frame.convert("RGB").tobytes())

    encoder.stdin.close()
    encoder.wait()
    decoder.kill()
    print(f"wrote {OUTPUT} ({frames / FPS:.1f}s)")


if __name__ == "__main__":
    main()
