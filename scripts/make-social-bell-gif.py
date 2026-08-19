#!/usr/bin/env python3
"""Build the square, looping social animation from The Bell's exact site mark."""

from pathlib import Path
from math import sin, pi

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "header-bell-mark-transparent-2048.png"
OUTPUT_DIR = ROOT / "assets" / "social"
OUTPUT_GIF = OUTPUT_DIR / "the-bell-swing-loop.gif"
OUTPUT_PREVIEW = OUTPUT_DIR / "the-bell-swing-loop-preview.png"

SIZE = 768
FRAMES = 60
FRAME_MS = 50
GOLD = "#D7B052"
BG = "#171714"
WHITE = "#F5F2EA"
MUTED = "#9B978E"


def font(path: str, size: int):
    return ImageFont.truetype(path, size)


DISPLAY = "/System/Library/Fonts/SFNS.ttf"
MONO = "/System/Library/Fonts/SFNSMono.ttf"


def exact_bell_body():
    """Extract only the bell body from the canonical transparent logo PNG."""
    mark = Image.open(SOURCE).convert("RGBA").resize((816, 816), Image.Resampling.LANCZOS)
    pixels = mark.load()
    cx, cy = 408, 418
    for y in range(mark.height):
        for x in range(mark.width):
            if ((x - cx) ** 2 + (y - cy) ** 2) ** 0.5 > 150:
                r, g, b, _ = pixels[x, y]
                pixels[x, y] = (r, g, b, 0)
    bbox = mark.getbbox()
    body = mark.crop(bbox)
    target_h = 238
    target_w = round(body.width * target_h / body.height)
    return body.resize((target_w, target_h), Image.Resampling.LANCZOS)


def centered_text(draw, xy, text, face, fill, spacing=0):
    if spacing == 0:
        box = draw.textbbox((0, 0), text, font=face)
        draw.text((xy[0] - (box[2] - box[0]) / 2, xy[1]), text, font=face, fill=fill)
        return
    widths = [draw.textlength(ch, font=face) for ch in text]
    total = sum(widths) + spacing * (len(text) - 1)
    x = xy[0] - total / 2
    for ch, width in zip(text, widths):
        draw.text((x, xy[1]), ch, font=face, fill=fill)
        x += width + spacing


def make_frame(body, index):
    canvas = Image.new("RGBA", (SIZE, SIZE), BG)
    draw = ImageDraw.Draw(canvas)

    # Fixed frame keeps the brand mark crisp while the bell behaves like a pendulum.
    center_x, center_y, radius = 384, 292, 218
    draw.ellipse(
        (center_x - radius, center_y - radius, center_x + radius, center_y + radius),
        outline=GOLD,
        width=9,
    )

    swing = Image.new("RGBA", (520, 520), (0, 0, 0, 0))
    swing_draw = ImageDraw.Draw(swing)
    pivot = (260, 70)
    body_x = pivot[0] - body.width // 2
    body_y = 158
    swing_draw.line((pivot[0], pivot[1], pivot[0], body_y + 8), fill=GOLD, width=8)
    swing.alpha_composite(body, (body_x, body_y))

    angle = 17.0 * sin(2 * pi * index / FRAMES)
    moved = swing.rotate(angle, resample=Image.Resampling.BICUBIC, center=pivot, expand=False)
    canvas.alpha_composite(moved, (center_x - pivot[0], 130 - pivot[1]))

    centered_text(draw, (SIZE / 2, 564), "THE BELL", font(DISPLAY, 53), WHITE)
    centered_text(draw, (SIZE / 2, 631), "THEBELL.VOTE", font(MONO, 17), GOLD, spacing=4)

    # A small visual cadence line gives the loop a deliberate editorial finish.
    draw.line((310, 687, 458, 687), fill="#3C3933", width=2)
    dot_x = 310 + 148 * ((sin(2 * pi * index / FRAMES) + 1) / 2)
    draw.ellipse((dot_x - 4, 683, dot_x + 4, 691), fill=GOLD)
    return canvas.convert("P", palette=Image.Palette.ADAPTIVE, colors=96)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    body = exact_bell_body()
    frames = [make_frame(body, i) for i in range(FRAMES)]
    frames[0].convert("RGBA").save(OUTPUT_PREVIEW)
    frames[0].save(
        OUTPUT_GIF,
        save_all=True,
        append_images=frames[1:],
        duration=FRAME_MS,
        loop=0,
        disposal=2,
        optimize=True,
    )
    print(OUTPUT_GIF)


if __name__ == "__main__":
    main()
