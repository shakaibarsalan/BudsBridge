#!/usr/bin/env python3
"""Draws the Windows installer's artwork from the app icon: the sidebar on
the welcome and finish pages (164 x 314) and the header on the other pages
(150 x 57). NSIS wants 24-bit BMPs at these sizes.

    python3 scripts/installer-art.py
"""

import subprocess
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parents[1]
ICONS = ROOT / "apps/desktop/src-tauri/icons"
OUT = ICONS / "installer"


def font(name: str, size: int) -> ImageFont.FreeTypeFont:
    path = subprocess.run(
        ["fc-match", "-f", "%{file}", name], capture_output=True, text=True, check=True
    ).stdout
    return ImageFont.truetype(path, size)


def logo(size: int) -> Image.Image:
    return Image.open(ICONS / "128x128@2x.png").convert("RGBA").resize((size, size), Image.LANCZOS)


def centred(draw: ImageDraw.ImageDraw, y: int, text: str, typeface, fill, width: int) -> None:
    draw.text(((width - draw.textlength(text, font=typeface)) / 2, y), text, font=typeface, fill=fill)


def sidebar() -> Image.Image:
    width, height = 164, 314
    image = Image.new("RGB", (width, height))
    draw = ImageDraw.Draw(image)
    top, bottom = (12, 22, 48), (6, 9, 20)
    for y in range(height):
        p = y / (height - 1)
        draw.line([(0, y), (width, y)], fill=tuple(round(a + (b - a) * p) for a, b in zip(top, bottom)))
    glow = Image.new("RGBA", (width, height))
    ImageDraw.Draw(glow).ellipse((-30, 20, width + 30, 170), fill=(47, 111, 214, 90))
    glow = glow.filter(ImageFilter.GaussianBlur(30))
    image.paste(glow, (0, 0), glow)
    mark = logo(84)
    image.paste(mark, ((width - 84) // 2, 44), mark)
    centred(draw, 142, "BudsBridge", font("Inter:semibold", 21), (255, 255, 255), width)
    small = font("Inter", 12)
    centred(draw, 176, "Your phone and laptop", small, (184, 196, 220), width)
    centred(draw, 192, "in the same earbuds", small, (184, 196, 220), width)
    return image


def header() -> Image.Image:
    image = Image.new("RGB", (150, 57), (255, 255, 255))
    mark = logo(40)
    image.paste(mark, (6, 8), mark)
    ImageDraw.Draw(image).text((52, 18), "BudsBridge", font=font("Inter:semibold", 15), fill=(27, 31, 42))
    return image


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sidebar().save(OUT / "sidebar.bmp")
    header().save(OUT / "header.bmp")
    print(f"wrote {OUT / 'sidebar.bmp'} and {OUT / 'header.bmp'}")


if __name__ == "__main__":
    main()
