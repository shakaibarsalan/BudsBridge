#!/usr/bin/env python3
"""Records the walkthrough: BudsBridge in demo mode on a virtual display,
driven step by step in time with the narration from narrate.py.

Writes recording.mp4 and timeline.json to OUT_DIR (default target/video).
The timeline holds what compose.py draws on top, in frame pixels: the
pointer's path, clicks, attention rings, key badges, the tray icon's state,
and when each line is spoken. Every step starts once the previous line has
been spoken, plus a short breath, so the narration sets the pace.

Linux only. Needs Xvfb, xdotool, ffmpeg, ImageMagick's `display`,
dbus-launch, Pillow, numpy, python-xlib, and a build with the UI embedded:
    (cd apps/desktop && pnpm tauri build --debug --no-bundle)
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

sys.path.insert(0, str(Path(__file__).parent))
from layout import (  # noqa: E402
    DESKTOP_H,
    FPS,
    FRAME_W,
    GDK_SCALE,
    SCREEN_H,
    SCREEN_W,
    TRAY_ICON,
    to_frame,
    to_screen,
)

ROOT = Path(__file__).resolve().parents[2]
APP = Path(os.environ.get("APP", ROOT / "target/debug/budsbridge"))
OUT = Path(os.environ.get("OUT_DIR", ROOT / "target/video"))
VOICE = OUT / "voice" / "lines.json"
DISPLAY = os.environ.get("DISPLAY_NUM", ":93")

BREATH = 0.55  # between one line ending and the next step
LINE_DELAY = 0.15  # from a step starting to its line starting
ACTION_DELAY = 0.3  # from a step starting to its first action
END_HOLD = 1.6
# The wallpaper's title ends above this, in display pixels; the camera never
# zooms in so far that it would cut through it.
TITLE_BOTTOM = 310

# Points and boxes in the dock, in logical pixels (the dock is 380 wide).
# Measured from the top while no list above them is open...
FROM_TOP = {
    "hero": (18, 112, 346, 120),
    "count": (22, 238, 338, 46),
    "buds": (24, 283, 164, 62),
    "phone": (192, 283, 164, 62),
    "hotkey": (24, 349, 164, 62),
    "reconnect": (192, 349, 164, 62),
    "devices": (40, 420, 300, 30),
    "phones-header": (40, 457, 300, 30),  # while the device list is closed
}
# ...and from the bottom, for what sits below the lists.
FROM_BOTTOM = {
    "phones": (40, 103, 300, 30),
    "all-settings": (40, 52, 300, 30),
}

def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = subprocess.run(
        ["fc-match", "-f", "%{file}", name], capture_output=True, text=True, check=True
    ).stdout
    return ImageFont.truetype(path, size)


def xdo(*args: str) -> str:
    return subprocess.run(
        ["xdotool", *args], capture_output=True, text=True, env=ENV
    ).stdout.strip()


ENV = dict(os.environ, DISPLAY=DISPLAY)


class Timeline:
    """Runs actions on a clock that starts at zero and logs what to draw."""

    def __init__(self) -> None:
        self.events: list[dict] = []
        self.cursor = (540.0, 560.0)
        self.start = 0.0

    def begin(self) -> None:
        self.start = time.monotonic()
        self.start_wall = time.time()
        self.log("cursor", x=self.cursor[0], y=self.cursor[1])
        self.camera(SCREEN_W, 0)

    def camera(self, width: float, seconds: float = 0.9) -> None:
        """Eases the view to a crop `width` display pixels wide, kept in the
        bottom-right corner, where the dock and the tray are."""
        self.log("camera", width=round(width, 1), ease=seconds)

    def now(self) -> float:
        return time.monotonic() - self.start

    def wait_until(self, t: float) -> None:
        delay = t - self.now()
        if delay > 0:
            time.sleep(delay)

    def hold(self, seconds: float) -> None:
        self.wait_until(self.now() + seconds)

    def log(self, kind: str, **data) -> None:
        self.events.append({"t": round(self.now(), 3), "type": kind, **data})

    def glide(self, x: float, y: float, seconds: float = 0.8) -> None:
        """Moves the pointer along an eased path, in frame pixels."""
        x0, y0 = self.cursor
        steps = max(12, int(seconds * 40))
        begin = self.now()
        for i in range(1, steps + 1):
            p = i / steps
            e = 4 * p**3 if p < 0.5 else 1 - (-2 * p + 2) ** 3 / 2
            self.cursor = (x0 + (x - x0) * e, y0 + (y - y0) * e)
            self.wait_until(begin + seconds * p)
            self.log("cursor", x=round(self.cursor[0], 1), y=round(self.cursor[1], 1))
            if self.cursor[1] < DESKTOP_H:
                sx, sy = to_screen(*self.cursor)
                xdo("mousemove", str(min(sx, SCREEN_W - 1)), str(min(sy, SCREEN_H - 1)))

    def click(self) -> None:
        self.log("click", x=self.cursor[0], y=self.cursor[1])
        if self.cursor[1] < DESKTOP_H:
            xdo("click", "1")

    def ring(self, box: tuple[float, float, float, float], seconds: float) -> None:
        self.log("ring", box=[round(v, 1) for v in box], until=round(self.now() + seconds, 3))

    def keys(self, labels: list[str], combo: str) -> None:
        self.log("keys", labels=labels, until=round(self.now() + 1.6, 3))
        self.hold(0.3)
        xdo("key", combo)
        self.hold(1.3)


def window(name: str) -> tuple[int, int, int, int] | None:
    ids = xdo("search", "--onlyvisible", "--name", name).split()
    if not ids:
        return None
    info = dict(
        line.split("=", 1) for line in xdo("getwindowgeometry", "--shell", ids[0]).splitlines()
    )
    return int(info["X"]), int(info["Y"]), int(info["WIDTH"]), int(info["HEIGHT"])


def dock() -> tuple[int, int, int, int]:
    for _ in range(50):
        geometry = window("^BudsBridge$")
        if geometry:
            return geometry
        time.sleep(0.1)
    raise SystemExit("the dock never appeared")


def dock_box(name: str) -> tuple[float, float, float, float]:
    """A dock element's box, in frame pixels."""
    x, y, _, h = dock()
    if name in FROM_TOP:
        lx, ly, lw, lh = FROM_TOP[name]
        top = y + ly * GDK_SCALE
    else:
        lx, lb, lw, lh = FROM_BOTTOM[name]
        top = y + h - lb * GDK_SCALE
    fx, fy = to_frame(x + lx * GDK_SCALE, top)
    fw, fh = to_frame(lw * GDK_SCALE, lh * GDK_SCALE)
    return fx, fy, fw, fh


def dock_point(name: str, dx: float = 0.5, dy: float = 0.5) -> tuple[float, float]:
    fx, fy, fw, fh = dock_box(name)
    return fx + fw * dx, fy + fh * dy


def frame_dock(tl: Timeline, seconds: float = 0.9) -> None:
    """Zooms in so the dock, as tall as it is now, fills the view."""
    _, _, _, height = dock()
    needed = (height + 24 * GDK_SCALE + 28 * GDK_SCALE) * FRAME_W / DESKTOP_H
    if SCREEN_H - needed * DESKTOP_H / FRAME_W < TITLE_BOTTOM:
        needed = SCREEN_W
    tl.camera(min(max(needed, 1000), SCREEN_W), seconds)


def close_window(window_id: str) -> None:
    """Asks a window to close, as a window manager would. BudsBridge then
    hides it rather than quitting."""
    from Xlib import X, display, protocol

    connection = display.Display(DISPLAY)
    target = connection.create_resource_object("window", int(window_id))
    message = protocol.event.ClientMessage(
        window=target,
        client_type=connection.intern_atom("WM_PROTOCOLS"),
        data=(32, [connection.intern_atom("WM_DELETE_WINDOW"), X.CurrentTime, 0, 0, 0]),
    )
    target.send_event(message)
    connection.flush()
    connection.close()


def wait_for(name: str, seconds: float = 5) -> tuple[int, int, int, int]:
    for _ in range(int(seconds * 10)):
        geometry = window(name)
        if geometry:
            return geometry
        time.sleep(0.1)
    raise SystemExit(f"no window named {name!r} appeared")


def warm_up() -> None:
    """Opens the dock and the settings window once before recording. A
    webview's first paint takes about a second, which would show on camera
    as an empty window."""
    open_dock()
    time.sleep(2)
    x, y = to_screen(*dock_point("all-settings", 0.2, 0.5))
    xdo("mousemove", str(x), str(y))
    xdo("click", "1")
    wait_for("BudsBridge settings")
    time.sleep(3)
    for window_id in xdo("search", "--onlyvisible", "--name", "BudsBridge settings").split():
        close_window(window_id)
    time.sleep(1)
    if window("BudsBridge"):
        raise SystemExit("a window is still open after warming up")


def open_dock() -> None:
    """What a click on the tray icon does: a second launch shows the dock."""
    subprocess.Popen([str(APP)], env=APP_ENV, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    dock()


# One function per line in narrate.py, run when that line starts.


def step_tray(tl: Timeline) -> None:
    tl.hold(1.2)
    tl.glide(700, 760, 1.6)
    tl.hold(2.6)
    tl.glide(*TRAY_ICON, 1.4)
    tl.ring((TRAY_ICON[0] - 24, TRAY_ICON[1] - 24, 48, 48), 2.4)


def step_open(tl: Timeline) -> None:
    tl.click()
    tl.log("tray", state="connected")
    open_dock()
    tl.hold(0.3)
    frame_dock(tl, 1.1)
    tl.hold(0.4)
    tl.glide(*dock_point("hero", 0.62, 1.15), 1.0)


def step_picture(tl: Timeline) -> None:
    tl.ring(dock_box("hero"), 4.0)
    tl.hold(0.6)
    tl.glide(*dock_point("hero", 0.18, 0.55), 1.2)
    tl.hold(1.2)
    tl.glide(*dock_point("hero", 0.86, 0.5), 1.4)


def step_phone(tl: Timeline) -> None:
    tl.glide(*dock_point("phone", 0.45, 0.55), 0.9)
    tl.hold(0.3)
    tl.click()
    tl.hold(1.0)
    tl.glide(*dock_point("hero", 0.5, 0.55), 1.2)


def step_sources(tl: Timeline) -> None:
    tl.ring(dock_box("count"), 3.0)
    tl.glide(*dock_point("count", 0.22, 0.95), 0.9)


def step_release(tl: Timeline) -> None:
    tl.hold(0.9)
    tl.glide(*dock_point("buds", 0.45, 0.55), 0.9)
    tl.hold(0.3)
    tl.click()
    tl.hold(0.5)
    tl.log("tray", state="idle")


def step_hotkey(tl: Timeline) -> None:
    tl.glide(410, 800, 1.0)
    tl.keys(["Ctrl", "Alt", "B"], "ctrl+alt+b")
    tl.log("tray", state="connected")


def step_reconnect(tl: Timeline) -> None:
    tl.glide(*dock_point("reconnect", 0.5, 0.6), 1.0)
    tl.ring(dock_box("reconnect"), 2.4)


def step_devices(tl: Timeline) -> None:
    tl.camera(SCREEN_W, 0.7)
    tl.glide(*dock_point("devices", 0.2, 0.5), 0.8)
    tl.hold(0.2)
    tl.click()
    tl.hold(0.9)
    _, top, _, _ = dock_box("devices")
    tl.glide(tl.cursor[0] + 40, top + 120, 1.0)


def step_phones(tl: Timeline) -> None:
    tl.glide(*dock_point("phones", 0.2, 0.5), 0.9)
    tl.hold(0.2)
    tl.click()
    tl.hold(0.9)
    tl.glide(tl.cursor[0] + 60, tl.cursor[1] + 70, 0.9)
    tl.hold(1.0)
    # Fold the list away again, so the dock is back to its usual size.
    tl.glide(*dock_point("phones-header", 0.2, 0.5), 0.5)
    tl.click()


def step_settings(tl: Timeline) -> None:
    tl.glide(*dock_point("all-settings", 0.2, 0.5), 0.9)
    tl.camera(SCREEN_W, 0.7)
    tl.hold(0.5)
    tl.click()
    x, y, w, h = wait_for("BudsBridge settings")
    tl.hold(0.4)
    tl.glide(*to_frame(x + w * 0.45, y + h * 0.55), 0.9)
    for _ in range(12):
        xdo("click", "5")
        tl.hold(0.07)
    tl.hold(0.6)
    tl.glide(*to_frame(x + w * 0.3, y + h * 0.62), 1.0)


def step_end(tl: Timeline) -> None:
    settings = xdo("search", "--onlyvisible", "--name", "BudsBridge settings").split()
    tl.hold(0.6)
    tl.glide(*TRAY_ICON, 1.2)
    tl.click()
    for window_id in settings:
        close_window(window_id)
    open_dock()
    tl.hold(0.3)
    frame_dock(tl, 1.1)
    tl.hold(0.3)
    tl.glide(*dock_point("hero", 0.5, 1.2), 1.0)


STEPS = {
    "tray": step_tray,
    "open": step_open,
    "picture": step_picture,
    "phone": step_phone,
    "sources": step_sources,
    "release": step_release,
    "hotkey": step_hotkey,
    "reconnect": step_reconnect,
    "devices": step_devices,
    "phones": step_phones,
    "settings": step_settings,
    "end": step_end,
}


def wallpaper(path: Path) -> None:
    """The desktop behind the dock, with the app's name in the corner."""
    w, h = SCREEN_W, SCREEN_H
    t = np.linspace(0.0, 1.0, h)[:, None, None]
    top, bottom = np.array([43, 53, 80]), np.array([14, 17, 24])
    pixels = np.broadcast_to(top + (bottom - top) * t, (h, w, 3)).copy()
    glow = Image.new("RGB", (w, h))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse((-200, -260, 760, 640), fill=(40, 90, 190))
    glow_draw.ellipse((-260, 980, 520, 1720), fill=(20, 110, 80))
    pixels += np.asarray(glow.filter(ImageFilter.GaussianBlur(220)), dtype=float) / 3
    image = Image.fromarray(np.clip(pixels, 0, 255).astype("uint8"))

    draw = ImageDraw.Draw(image)
    icon = Image.open(ROOT / "apps/desktop/src-tauri/icons/128x128@2x.png").convert("RGBA")
    icon = icon.resize((104, 104), Image.LANCZOS)
    # Kept above TITLE_BOTTOM.
    image.paste(icon, (64, 28), icon)
    draw.text((188, 34), "BudsBridge", font=font("Inter:semibold", 60), fill=(245, 247, 250))
    draw.text((190, 102), "for Windows", font=font("Inter", 30), fill=(150, 160, 180))
    tagline = font("Inter:medium", 38)
    draw.text((66, 170), "Hear your phone and", font=tagline, fill=(214, 221, 233))
    draw.text((66, 216), "laptop in the same buds.", font=tagline, fill=(214, 221, 233))
    draw.text(
        (66, 272), "Demo mode: simulated devices", font=font("Inter", 24), fill=(120, 130, 150)
    )
    image.save(path)


def start_display(work: Path) -> list[subprocess.Popen]:
    processes = [
        subprocess.Popen(
            ["Xvfb", DISPLAY, "-screen", "0", f"{SCREEN_W}x{SCREEN_H}x24", "-nolisten", "tcp"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    ]
    time.sleep(1)
    wallpaper(work / "wallpaper.png")
    processes.append(
        subprocess.Popen(
            ["display", "-geometry", "+0+0", "-immutable", str(work / "wallpaper.png")],
            env=ENV,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    )
    time.sleep(1.5)
    return processes


def dbus_session() -> dict[str, str]:
    """A session bus shared by both launches, so the second one reaches the first."""
    output = subprocess.run(
        ["dbus-launch", "--sh-syntax"], capture_output=True, text=True, env=ENV, check=True
    ).stdout
    return dict(re.findall(r"(DBUS_SESSION_BUS_[A-Z]+)='?([^';]+)'?;", output))


class Recorder:
    def __init__(self, path: Path) -> None:
        self.started = threading.Event()
        self.first_frame = None
        self.process = subprocess.Popen(
            [
                "ffmpeg", "-hide_banner", "-y", "-f", "x11grab", "-draw_mouse", "0",
                "-framerate", str(FPS), "-video_size", f"{SCREEN_W}x{SCREEN_H}",
                "-i", f"{DISPLAY}+0,0", "-c:v", "libx264", "-preset", "ultrafast",
                "-crf", "10", "-pix_fmt", "yuv420p", str(path),
            ],
            stdin=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        threading.Thread(target=self._read_log, daemon=True).start()
        if not self.started.wait(10):
            raise SystemExit("ffmpeg did not start recording")

    def _read_log(self) -> None:
        for line in self.process.stderr:
            match = re.search(r"start: (\d+\.\d+)", line)
            if match and self.first_frame is None:
                # Wall-clock time of the first frame (x11grab stamps frames
                # with the wall clock).
                self.first_frame = float(match.group(1))
                self.started.set()

    def stop(self) -> None:
        self.process.stdin.write("q")
        self.process.stdin.flush()
        self.process.wait(30)


def main() -> None:
    if not APP.exists():
        sys.exit(f"build the app first: {APP} not found")
    if not VOICE.exists():
        sys.exit(f"run narrate.py first: {VOICE} not found")
    lines = json.loads(VOICE.read_text())
    OUT.mkdir(parents=True, exist_ok=True)

    work = Path(tempfile.mkdtemp(prefix="budsbridge-video-"))
    processes = start_display(work)
    global APP_ENV
    APP_ENV = dict(
        ENV,
        **dbus_session(),
        GDK_SCALE=str(GDK_SCALE),
        GTK_THEME="Adwaita:dark",
        BUDSBRIDGE_DEMO="1",
        BUDSBRIDGE_DOCK_PINNED="1",
        XDG_CONFIG_HOME=str(work / "config"),
        XDG_DATA_HOME=str(work / "data"),
    )
    app = subprocess.Popen(
        [str(APP), "--minimized"],
        env=APP_ENV,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    time.sleep(7)  # the UI loads in the hidden windows
    warm_up()

    tl = Timeline()
    sx, sy = to_screen(*tl.cursor)
    xdo("mousemove", str(sx), str(sy))
    recorder = Recorder(OUT / "recording.mp4")
    time.sleep(1.0)
    tl.begin()
    try:
        line_end = -BREATH
        for line in lines:
            start = max(tl.now(), line_end + BREATH)
            tl.wait_until(start)
            spoken = start + LINE_DELAY
            line_end = spoken + line["dur"]
            tl.log("line", id=line["id"], text=line["text"], file=line["file"],
                   start=round(spoken, 3), end=round(line_end, 3))
            tl.wait_until(start + ACTION_DELAY)
            STEPS[line["id"]](tl)
            print(f"{line['id']:10} at {start:6.2f}s, done at {tl.now():6.2f}s")
        tl.wait_until(max(line_end, tl.now()) + END_HOLD)
        duration = tl.now()
    finally:
        recorder.stop()
        app.terminate()
        for process in processes:
            process.terminate()
        subprocess.run(["pkill", "-x", "budsbridge"], check=False)
        shutil.rmtree(work, ignore_errors=True)

    timeline = {
        "duration": round(duration, 3),
        # Seconds into the recording where the timeline's zero falls.
        "offset": round(tl.start_wall - recorder.first_frame, 3),
        "events": tl.events,
    }
    (OUT / "timeline.json").write_text(json.dumps(timeline, indent=1))
    print(f"recorded {duration:.1f}s, timeline offset {timeline['offset']:.2f}s")


APP_ENV: dict[str, str] = {}

if __name__ == "__main__":
    main()
