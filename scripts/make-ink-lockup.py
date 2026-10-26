"""Ink copy of the supplied lockup, for light grounds.

Same artwork as public/brand/alert-global-tech-lockup-ivory.png: every pixel set to Deep Ink (#101B32),
the supplied alpha kept as is, so the shape is untouched (the method used for the Ink wordmark).
Replace the output with an official Ink lockup if one is supplied.

Run: python3 scripts/make-ink-lockup.py
Needs Pillow and numpy.
"""

import numpy as np
from PIL import Image

src = np.array(Image.open("public/brand/alert-global-tech-lockup-ivory.png").convert("RGBA"))
out = np.zeros_like(src)
out[..., :3] = (0x10, 0x1B, 0x32)
out[..., 3] = src[..., 3]
Image.fromarray(out, "RGBA").save("public/brand/alert-global-tech-lockup-ink.png")
print("Wrote public/brand/alert-global-tech-lockup-ink.png")
