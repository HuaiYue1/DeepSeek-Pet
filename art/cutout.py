"""Cut the character out of AI-generated art and line the expressions up.

The AI images come with a plain background. This removes it with the
isnet-anime segmentation model, cleans the white fringe off the edges and
crops every image with the same box, so all expressions stay aligned when
the desktop pet swaps between them.

    pip install onnxruntime numpy pillow
    python art/cutout.py art/raw/*.png              # -> art/png/<name>.png

The model (~170 MB) is downloaded on first run to ~/.cache/deepseek-pet/.
"""

import argparse
import sys
import urllib.request
from pathlib import Path

import numpy as np
import onnxruntime as ort
from PIL import Image

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


def predict_alpha(session, rgb):
    """Foreground probability in [0, 1] at the image's own size."""
    x = np.asarray(rgb.resize((SIZE, SIZE), Image.LANCZOS), dtype=np.float32)
    x = x / max(x.max(), 1.0) - np.array([0.485, 0.456, 0.406], dtype=np.float32)
    x = x.transpose(2, 0, 1)[None]
    pred = session.run(None, {session.get_inputs()[0].name: x})[0][0, 0]
    pred = (pred - pred.min()) / max(pred.max() - pred.min(), 1e-6)
    mask = Image.fromarray((pred * 255).astype(np.uint8)).resize(rgb.size, Image.LANCZOS)
    alpha = np.asarray(mask, dtype=np.float32) / 255
    # drop the faint haze and make the inside fully solid
    return np.clip((alpha - 0.08) / 0.84, 0, 1)


def cut(rgb, alpha, background):
    """RGBA with the background colour removed from half-transparent edge pixels."""
    c = np.asarray(rgb, dtype=np.float32)
    a = alpha[..., None]
    fg = np.where(a > 0.02, (c - (1 - a) * background) / np.maximum(a, 0.02), c)
    out = np.dstack([np.clip(fg, 0, 255), alpha * 255]).astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def border_colour(rgb):
    """The background colour, taken from the image border."""
    c = np.asarray(rgb, dtype=np.float32)
    edge = np.concatenate([c[0], c[-1], c[:, 0], c[:, -1]])
    return np.median(edge, axis=0)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("images", nargs="+", type=Path)
    ap.add_argument("--out", type=Path, default=Path(__file__).parent / "png")
    ap.add_argument("--height", type=int, default=1600, help="height of the output images")
    ap.add_argument("--pad", type=float, default=0.03, help="padding around the character, as a fraction of its height")
    args = ap.parse_args()

    session = load_model()
    cuts = []
    for path in args.images:
        rgb = Image.open(path).convert("RGB")
        alpha = predict_alpha(session, rgb)
        cuts.append((path, cut(rgb, alpha, border_colour(rgb))))
        print(f"cut {path}")

    # One crop box for every image of the same size, so the expressions line up.
    boxes = {}
    for _, im in cuts:
        box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
        if box:
            old = boxes.get(im.size)
            boxes[im.size] = box if not old else (min(old[0], box[0]), min(old[1], box[1]), max(old[2], box[2]), max(old[3], box[3]))

    args.out.mkdir(parents=True, exist_ok=True)
    for path, im in cuts:
        l, t, r, b = boxes[im.size]
        pad = int((b - t) * args.pad)
        im = im.crop((l - pad, t - pad, r + pad, b + pad))
        scale = args.height / im.height
        im = im.resize((round(im.width * scale), args.height), Image.LANCZOS)
        dest = args.out / f"{path.stem}.png"
        im.save(dest, optimize=True)
        print(f"wrote {dest} ({im.width}x{im.height})")


if __name__ == "__main__":
    sys.exit(main())
