"""Ivory a! monogram for "The Dot" (hub in scene 4).

Cut from the approved Ivory wordmark (public/brand/alert-global-tech-wordmark-ivory.png):
the columns left of the "e", trimmed. Same artwork, no redrawing or recolouring; the same
method make-halftone-cutouts.py uses for the Ink monogram. Used only when no official
public/logo/monogram.svg has been supplied.

Run: python3 scripts/make-the-dot-monogram.py   (needs numpy and Pillow)
"""

import numpy as np
from PIL import Image

SRC = "public/brand/alert-global-tech-wordmark-ivory.png"
OUT = "public/brand/alert-global-tech-monogram-ivory.png"

src = Image.open(SRC)
a = np.asarray(src)[..., -1]  # alpha (LA or RGBA)
cols = a.max(axis=0) > 0
x = 0
while cols[x]:
    x += 1  # through the a
while not cols[x]:
    x += 1  # gap between a and !
while cols[x]:
    x += 1  # through the !
part = src.crop((0, 0, x, src.height))
part = part.crop(part.getbbox())
part.save(OUT)
print(OUT, part.size)
