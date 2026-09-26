"""Cut the character out of AI-generated art and line the expressions up.

Images on a plain white background get it removed, keeping the little
effects drawn around her (hearts, "!", Zzz, thought bubbles) and cleaning
the white fringe off the edges. Images that are already transparent are
used as they are. Every expression then goes on one canvas, anchored at
her feet, so the desktop pet can swap between them without the character
jumping around.

    pip install onnxruntime numpy pillow scipy

    # one image per expression; --normalize scales them to the same body height
    python art/cutout.py art/raw/hd/*.png --normalize

    # or a sheet with several expressions in a grid
    python art/cutout.py art/raw/sheet.png --grid 4x2 --names hello,idle,think,busy,happy,aha,eat,sleep

Output goes to art/png/<name>.png. The anime segmentation model (isnet-anime,
~170 MB) is downloaded on first run to ~/.cache/deepseek-pet/.
"""

import argparse
import sys
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image
from scipy import ndimage

MODEL_URL = "https://github.com/danielgatis/rembg/releases/download/v0.0.0/isnet-anime.onnx"
MODEL_PATH = Path.home() / ".cache" / "deepseek-pet" / "isnet-anime.onnx"
SIZE = 1024


def load_model():
    if not MODEL_PATH.exists():
        MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
        print(f"downloading {MODEL_URL}")
        tmp = MODEL_PATH.with_suffix(".part")
        urllib.request.urlretrieve(MODEL_URL, tmp)
        tmp.rename(MODEL_PATH)
    return ort.InferenceSession(str(MODEL_PATH), providers=["CPUExecutionProvider"])


def background_colour(rgb):
    a = np.asarray(rgb, dtype=np.float32)
    return np.median(np.concatenate([a[0], a[-1], a[:, 0], a[:, -1]]), axis=0)


def distance(rgb, bg):
    """How far each pixel is from the background colour, 0..255."""
    return np.abs(np.asarray(rgb, dtype=np.float32) - bg).max(axis=2)


def model_alpha(session, rgb, bg):
    """isnet-anime foreground probability, run on a square-padded copy."""
    w, h = rgb.size
    side = max(w, h)
    square = Image.new("RGB", (side, side), tuple(int(v) for v in bg))
    square.paste(rgb, ((side - w) // 2, (side - h) // 2))
    x = np.asarray(square.resize((SIZE, SIZE), Image.LANCZOS), dtype=np.float32)
    x = x / max(x.max(), 1.0) - np.array([0.485, 0.456, 0.406], dtype=np.float32)
    pred = session.run(None, {session.get_inputs()[0].name: x.transpose(2, 0, 1)[None]})[0][0, 0]
    pred = (pred - pred.min()) / max(pred.max() - pred.min(), 1e-6)
    mask = Image.fromarray((pred * 255).astype(np.uint8)).resize((side, side), Image.LANCZOS)
    mask = mask.crop(((side - w) // 2, (side - h) // 2, (side - w) // 2 + w, (side - h) // 2 + h))
    alpha = np.asarray(mask, dtype=np.float32) / 255
    return np.clip((alpha - 0.08) / 0.84, 0, 1)


def cut(session, rgb):
    """RGBA cut-out: the character from the model, effects from their ink."""
    bg = background_colour(rgb)
    dist = distance(rgb, bg)
    a_model = model_alpha(session, rgb, bg)
    # anything clearly drawn on the white (effects, stray strands) keeps its ink
    a_ink = np.clip((dist - 12) / 48, 0, 1)
    alpha = np.maximum(a_model, a_ink)

    # white areas closed off by effect outlines (thought bubbles, steam puffs, signs)
    # are part of the drawing; white areas closed off by her body are background
    solid = alpha > 0.5
    holes, n = ndimage.label(~solid)
    border = set(np.unique(np.concatenate([holes[0], holes[-1], holes[:, 0], holes[:, -1]])))
    for i in range(1, n + 1):
        if i in border:
            continue
        hole = holes == i
        ring = ndimage.binary_dilation(hole, iterations=3) & ~hole
        if a_model[ring].mean() < 0.5:
            alpha[hole] = 1

    # take the white back out of half-transparent edge pixels
    c = np.asarray(rgb, dtype=np.float32)
    a = alpha[..., None]
    fg = np.where(a > 0.02, (c - (1 - a) * bg) / np.maximum(a, 0.02), c)
    out = np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA"), a_model


def split_grid(rgb, cols, rows):
    """Split a sheet of figures into one image per figure.

    Marks are grouped into connected blobs and each blob goes to the grid
    cell holding its centre, so hair or effects that cross the cell lines
    stay with the right figure. Other figures' blobs are painted out.
    """
    bg = background_colour(rgb)
    ink = ndimage.binary_dilation(distance(rgb, bg) > 12, iterations=2)
    labels, n = ndimage.label(ink)
    h, w = labels.shape
    centres = ndimage.center_of_mass(ink, labels, range(1, n + 1))
    owner = np.zeros(n + 1, dtype=int) - 1
    for i, (cy, cx) in enumerate(centres, start=1):
        owner[i] = min(cols - 1, int(cx / (w / cols))) + cols * min(rows - 1, int(cy / (h / rows)))
    figures = []
    for cell in range(cols * rows):
        mine = np.isin(labels, np.where(owner == cell)[0])
        ys, xs = np.nonzero(mine)
        if not len(xs):
            figures.append(None)
            continue
        pad = 12
        l, t = max(0, xs.min() - pad), max(0, ys.min() - pad)
        r, b = min(w, xs.max() + pad + 1), min(h, ys.max() + pad + 1)
        arr = np.asarray(rgb).copy()
        others = (labels > 0) & ~mine
        arr[others] = bg.astype(np.uint8)
        figures.append(Image.fromarray(arr).crop((l, t, r, b)))
    return figures


def is_cut_out(im):
    """True for images that already have a transparent background."""
    if im.mode not in ("RGBA", "LA", "PA") and not (im.mode == "P" and "transparency" in im.info):
        return False
    return (np.asarray(im.convert("RGBA"))[..., 3] < 250).mean() > 0.05


def body_mask(alpha):
    """Her body: the largest solid blob, without the effects floating around her."""
    solid = alpha > 0.5
    labels, n = ndimage.label(solid)
    if n < 2:
        return solid
    sizes = ndimage.sum(solid, labels, range(1, n + 1))
    return labels == int(np.argmax(sizes)) + 1


def resize_rgba(im, size):
    """Resize with premultiplied alpha, so edges don't pick up the colour of transparent pixels."""
    a = np.asarray(im, dtype=np.float32) / 255
    premul = np.dstack([a[..., :3] * a[..., 3:], a[..., 3:]])
    chans = [Image.fromarray(premul[..., i]).resize(size, Image.LANCZOS) for i in range(4)]
    out = np.dstack([np.asarray(c, dtype=np.float32) for c in chans]).clip(0, 1)
    alpha = out[..., 3:]
    rgb = np.where(alpha > 1e-4, out[..., :3] / np.maximum(alpha, 1e-4), 0)
    return Image.fromarray((np.dstack([rgb, alpha]).clip(0, 1) * 255 + 0.5).astype(np.uint8), "RGBA")


def feet_anchor(a_model):
    """(x, y) between her feet: the bottom of the body, centred on the shoes."""
    body = a_model > 0.5
    ys, xs = np.nonzero(body)
    bottom = ys.max()
    height = bottom - ys.min()
    shoes = body & (np.arange(body.shape[0])[:, None] > bottom - height * 0.06)
    return float(np.nonzero(shoes)[1].mean()), float(bottom)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("images", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, default=Path(__file__).parent / "png")
    ap.add_argument("--grid", help="split each image into COLSxROWS figures, e.g. 4x2")
    ap.add_argument("--names", help="comma-separated output names for the grid cells, row by row")
    ap.add_argument("--nudge", action="append", default=[], help="NAME:DX,DY to shift one figure on the canvas")
    ap.add_argument("--normalize", action="store_true", help="scale every figure to the same body height")
    ap.add_argument("--max-body", type=int, default=1300, help="with --normalize: largest body height in pixels")
    args = ap.parse_args()

    sources = []
    for path in args.images:
        im = Image.open(path)
        if args.grid:
            cols, rows = (int(v) for v in args.grid.lower().split("x"))
            names = args.names.split(",") if args.names else [f"{path.stem}-{i + 1}" for i in range(cols * rows)]
            figures = split_grid(im.convert("RGB"), cols, rows)
            sources += [(name, fig) for name, fig in zip(names, figures) if fig is not None]
        else:
            sources.append((path.stem, im.convert("RGBA") if is_cut_out(im) else im.convert("RGB")))

    session = None
    figures = []
    for name, im in sources:
        if im.mode == "RGBA":
            rgba = im
            body = body_mask(np.asarray(im, dtype=np.float32)[..., 3] / 255)
            print(f"{name}: already transparent")
        else:
            session = session or load_model()
            rgba, a_model = cut(session, im)
            body = a_model > 0.5
            print(f"{name}: background removed")
        figures.append([name, rgba, body])

    # separately generated images come at different scales: bring them to one body height
    if args.normalize:
        heights = {name: int(np.ptp(np.nonzero(body.any(axis=1))[0])) + 1 for name, _, body in figures}
        target = min(float(np.median(list(heights.values()))), args.max_body)
        for fig in figures:
            name, im, body = fig
            k = target / heights[name]
            if abs(k - 1) > 0.002:
                size = (max(1, round(im.width * k)), max(1, round(im.height * k)))
                fig[1] = resize_rgba(im, size)
                fig[2] = np.asarray(Image.fromarray(body.astype(np.uint8) * 255).resize(size, Image.BILINEAR)) > 127
            print(f"{name}: body {heights[name]}px, scaled x{k:.3f}")

    nudges = {k: tuple(float(v) for v in d.split(",")) for k, d in (n.split(":") for n in args.nudge)}
    cuts = []
    for name, rgba, body in figures:
        ax, ay = feet_anchor(body)
        dx, dy = nudges.get(name, (0, 0))
        cuts.append((name, rgba, ax - dx, ay - dy))

    # one canvas for all, every figure placed with its feet on the same spot
    left = max(ax for _, _, ax, _ in cuts)
    top = max(ay for _, _, _, ay in cuts)
    right = max(im.width - ax for _, im, ax, _ in cuts)
    bottom = max(im.height - ay for _, im, _, ay in cuts)
    size = (int(np.ceil(left + right)), int(np.ceil(top + bottom)))
    args.out.mkdir(parents=True, exist_ok=True)
    for name, im, ax, ay in cuts:
        canvas = Image.new("RGBA", size, (0, 0, 0, 0))
        canvas.alpha_composite(im, (int(round(left - ax)), int(round(top - ay))))
        dest = args.out / f"{name}.png"
        canvas.save(dest, optimize=True)
        print(f"wrote {dest} ({size[0]}x{size[1]})")


if __name__ == "__main__":
    sys.exit(main())
