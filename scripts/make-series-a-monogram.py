"""Traces the a! monogram (public/art/security-sorted-monogram-ink.png, cut from the supplied wordmark)
into an SVG outline for the "Series A, sorted." end card supergraphic: the brand guide's outlined
monogram pattern (thin line, cropped by the frame edge). The shape is traced, not redrawn.

Run (numpy, Pillow, scikit-image): python3 scripts/make-series-a-monogram.py
Writes src/videos/series-a-monogram.json ({ width, height, d }).
"""

import json

import numpy as np
from PIL import Image
from skimage import measure

SRC = "public/art/security-sorted-monogram-ink.png"
OUT = "src/videos/series-a-monogram.json"
PAD = 4

alpha = np.array(Image.open(SRC))[:, :, 3].astype(float) / 255
alpha = np.pad(alpha, PAD)
h, w = alpha.shape
parts = []
for c in measure.find_contours(alpha, 0.5):
    c = measure.approximate_polygon(c, tolerance=0.35)
    pts = " ".join(f"{x:.1f} {y:.1f}" for y, x in c)
    parts.append(f"M{pts}Z")
with open(OUT, "w") as f:
    json.dump({"width": w, "height": h, "d": " ".join(parts)}, f)
print(f"Wrote {OUT}: {len(parts)} contours, {w}x{h}")
