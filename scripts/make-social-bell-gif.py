#!/usr/bin/env python3
"""Build a smooth square social loop matching the homepage light-mode Bell."""

from pathlib import Path
from math import sin, pi
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "assets" / "header-bell-mark-transparent-2048.png"
OUTPUT_DIR = ROOT / "assets" / "social"
OUTPUT_GIF = OUTPUT_DIR / "the-bell-swing-loop.gif"
OUTPUT_PREVIEW = OUTPUT_DIR / "the-bell-swing-loop-preview.png"
SIZE, SCALE, FRAMES, FRAME_MS = 768, 3, 72, 42
W = SIZE * SCALE
BG, SURFACE, INK = "#F4F0E7", "#FFFDF8", "#1D1D1A"
MUTED, LINE = "#6F6B62", "#CBC5B7"
BLUE, RED, GOLD = "#376B9F", "#A94339", "#AA8430"
DISPLAY = "/System/Library/Fonts/SFNS.ttf"
DISPLAY_BOLD = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
MONO = "/System/Library/Fonts/SFNSMono.ttf"


def s(value): return round(value * SCALE)
def font(path, size): return ImageFont.truetype(path, s(size))


def exact_bell_body():
    """Extract the canonical body and recolor it to the homepage gold."""
    mark = Image.open(SOURCE).convert("RGBA").resize((1224, 1224), Image.Resampling.LANCZOS)
    pixels = mark.load()
    cx, cy = 612, 627
    for y in range(mark.height):
        for x in range(mark.width):
            _, _, _, alpha = pixels[x, y]
            if ((x - cx) ** 2 + (y - cy) ** 2) ** .5 > 225:
                alpha = 0
            pixels[x, y] = (170, 132, 48, alpha)
    body = mark.crop(mark.getbbox())
    target_h = s(285)
    target_w = round(body.width * target_h / body.height)
    return body.resize((target_w, target_h), Image.Resampling.LANCZOS)


def centered(draw, x, y, text, face, fill, tracking=0):
    if not tracking:
        box = draw.textbbox((0, 0), text, font=face)
        draw.text((x - (box[2] - box[0]) / 2, y), text, font=face, fill=fill)
        return
    widths = [draw.textlength(ch, font=face) for ch in text]
    total = sum(widths) + s(tracking) * (len(text) - 1)
    cursor = x - total / 2
    for ch, width in zip(text, widths):
        draw.text((cursor, y), ch, font=face, fill=fill)
        cursor += width + s(tracking)


def make_frame(body, index):
    phase = sin(2 * pi * index / FRAMES)
    angle = 18 * phase
    canvas = Image.new("RGBA", (W, W), BG)
    draw = ImageDraw.Draw(canvas)

    draw.rectangle((s(18), s(18), s(750), s(750)), fill=SURFACE, outline=INK, width=s(2))
    draw.rectangle((s(18), s(18), s(750), s(29)), fill=BLUE)
    centered(draw, W / 2, s(60), "THE BELL", font(DISPLAY_BOLD, 54), INK)
    centered(draw, W / 2, s(127), "WHICH WAY WILL THE BELL SWING?", font(MONO, 14), GOLD, 1.4)

    pivot_x, pivot_y = s(384), s(170)
    layer = Image.new("RGBA", (s(520), s(520)), (0, 0, 0, 0))
    layer_draw = ImageDraw.Draw(layer)
    local_pivot = (s(260), s(45))
    body_x = local_pivot[0] - body.width // 2
    body_y = s(132)
    layer_draw.line((local_pivot[0], local_pivot[1], local_pivot[0], body_y + s(5)), fill=GOLD, width=s(4))
    layer.alpha_composite(body, (body_x, body_y))
    moved = layer.rotate(angle, resample=Image.Resampling.BICUBIC, center=local_pivot, expand=False)
    canvas.alpha_composite(moved, (pivot_x - local_pivot[0], pivot_y - local_pivot[1]))

    draw.line((s(310), s(674), s(458), s(674)), fill=LINE, width=s(1))
    dot_x = s(384 + phase * 70)
    draw.ellipse((dot_x-s(4), s(670), dot_x+s(4), s(678)), fill=GOLD)
    centered(draw, W / 2, s(700), "THEBELL.VOTE", font(MONO, 11), MUTED, 1.7)
    return canvas.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    body = exact_bell_body()
    rgba = [make_frame(body, i) for i in range(FRAMES)]
    rgba[0].save(OUTPUT_PREVIEW)
    frames = [item.convert("P", palette=Image.Palette.ADAPTIVE, colors=160) for item in rgba]
    frames[0].save(OUTPUT_GIF, save_all=True, append_images=frames[1:], duration=FRAME_MS,
                   loop=0, disposal=2, optimize=True)
    print(OUTPUT_GIF)


if __name__ == "__main__":
    main()
