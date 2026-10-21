"""Frame layout shared by record.py and compose.py.

The video is 1080 x 1350 (portrait, as LinkedIn shows it). From the top: the
recorded desktop, a drawn taskbar with BudsBridge's tray icon, and the
subtitle strip.
"""

FRAME_W, FRAME_H = 1080, 1350
FPS = 30

DESKTOP_H = 1176
TASKBAR_H = 64
TASKBAR_Y = DESKTOP_H
STRIP_Y = DESKTOP_H + TASKBAR_H
STRIP_H = FRAME_H - STRIP_Y

# The virtual display the app runs on, at 2x so text stays sharp. It is
# scaled down by K into the desktop area.
GDK_SCALE = 2
SCREEN_W, SCREEN_H = 1440, 1568
K = FRAME_W / SCREEN_W

# Centre of BudsBridge's icon in the drawn tray, in frame pixels.
TRAY_ICON = (842, TASKBAR_Y + TASKBAR_H // 2)


def camera_height(width: float) -> float:
    """Height of a camera crop `width` display pixels wide."""
    return width * DESKTOP_H / FRAME_W


def to_frame(x: float, y: float) -> tuple[float, float]:
    """Virtual display pixels to frame pixels."""
    return x * K, y * K


def to_screen(x: float, y: float) -> tuple[int, int]:
    """Frame pixels to virtual display pixels."""
    return round(x / K), round(y / K)
