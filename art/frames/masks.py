"""Masks and a guide picture for the animation frames in frames.json.

Each frame redraws one part of an original picture (art/raw/hd): the eyes,
the mouth, the raised hand or the legs. Its region is measured in sprite
pixels (art/cut, 908x1337); the originals were scaled and moved to make
the sprites, so this finds that scale and shift from the outline of each
picture and maps the region back onto the original.

    python art/frames/masks.py

writes masks/<frame>.png (the original's size; transparent where the frame
may change, as OpenAI's image editing wants) and guide.png (every frame's
original with the part to change marked in red).
"""

import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
ART = HERE.parent


def outline(path):
    a = np.asarray(Image.open(path).convert("RGBA"))[:, :, 3]
    ys, xs = np.nonzero(a > 40)
    return xs.min(), ys.min(), xs.max(), ys.max()


def sprite_to_original(base):
    """Scale and shift taking sprite pixels to the original's pixels."""
    o = outline(ART / "raw" / "hd" / f"{base}.png")
    c = outline(ART / "cut" / f"{base}.png")
    k = ((c[2] - c[0]) / (o[2] - o[0]) + (c[3] - c[1]) / (o[3] - o[1])) / 2
    dx = ((c[0] - k * o[0]) + (c[2] - k * o[2])) / 2
    dy = ((c[1] - k * o[1]) + (c[3] - k * o[3])) / 2
    return lambda x, y: ((x - dx) / k, (y - dy) / k), 1 / k


def draw_region(draw, region, to_original, scale, fill):
    for cx, cy, rx, ry in region.get("ellipses", []):
        x, y = to_original(cx, cy)
        draw.ellipse([x - rx * scale, y - ry * scale, x + rx * scale, y + ry * scale], fill=fill)
    for x0, y0, x1, y1 in region.get("rects", []):
        a, b = to_original(x0, y0)
        c, d = to_original(x1, y1)
        draw.rectangle([a, b, c, d], fill=fill)


def font(size):
    for name in ["wqy-zenhei.ttc", "msyh.ttc", "PingFang.ttc", "NotoSansCJK-Regular.ttc", "NotoSansSC-Regular.otf"]:
        try:
            return ImageFont.truetype(name, size), True
        except OSError:
            continue
    for path in Path("/usr/share/fonts").rglob("*.tt[cf]") if Path("/usr/share/fonts").exists() else []:
        if "wqy" in path.name or "Noto" in path.name:
            return ImageFont.truetype(str(path), size), True
    return ImageFont.load_default(), False


def main():
    spec = json.loads((HERE / "frames.json").read_text(encoding="utf-8"))
    (HERE / "masks").mkdir(exist_ok=True)
    tiles = []
    for i, f in enumerate(spec["frames"], 1):
        original = Image.open(HERE / f["image"]).convert("RGBA")
        base = Path(f["image"]).stem
        to_original, scale = sprite_to_original(base)

        mask = Image.new("RGBA", original.size, (255, 255, 255, 255))
        draw_region(ImageDraw.Draw(mask), f["region"], to_original, scale, (0, 0, 0, 0))
        mask.save(HERE / f["mask"])

        tile = Image.new("RGBA", original.size, (255, 255, 255, 255))
        tile.alpha_composite(original)
        overlay = Image.new("RGBA", original.size, (0, 0, 0, 0))
        draw_region(ImageDraw.Draw(overlay), f["region"], to_original, scale, (255, 40, 40, 110))
        tile.alpha_composite(overlay)
        tiles.append((i, f, tile.convert("RGB")))

    w, h = 300, 450
    cols = 5
    rows = (len(tiles) + cols - 1) // cols
    sheet = Image.new("RGB", (cols * w, rows * (h + 56)), "white")
    big, cjk = font(22)
    small, _ = font(17)
    draw = ImageDraw.Draw(sheet)
    for n, (i, f, tile) in enumerate(tiles):
        x, y = (n % cols) * w, (n // cols) * (h + 56)
        sheet.paste(tile.resize((w, h), Image.LANCZOS), (x, y))
        draw.text((x + 8, y + h + 4), f"{i:02d}  {f['name']}", fill=(20, 24, 70), font=big)
        if cjk:
            text = f["zh"]
            while draw.textlength(text, font=small) > w - 16:
                text = text[:-2] + "…"
            draw.text((x + 8, y + h + 31), text, fill=(90, 90, 120), font=small)
    sheet.save(HERE / "guide.png", optimize=True)
    print(f"wrote {len(tiles)} masks and guide.png")


if __name__ == "__main__":
    main()
