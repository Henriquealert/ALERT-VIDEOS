"""Original halftone cut-out artwork for the "Series A, sorted." promo (src/videos/SeriesAPromo.tsx). No photos, no stock, no logos.

Same newspaper-halftone treatment as scripts/make-halftone-cutouts.py (Deep Ink dots on a Soft Ivory
paper base, cut out on transparent), plus a slight paper grain, per the brief ("grain on the cut-outs only").

  public/art/series-a-laptop-open.png     the unbranded business laptop from Security, sorted, with grain
  public/art/series-a-laptop-closed.png   unbranded business laptop, closed, three-quarter view
  public/art/series-a-cabinet.png         vintage four-drawer filing cabinet, blank label holders
  public/art/series-a-stamp.png           rubber stamp: knob, turned neck, block handle, rubber base

Run after scripts/make-halftone-cutouts.py (it reads security-sorted-laptop.png):
  python3 scripts/make-series-a-cutouts.py
Needs numpy and Pillow.
"""

import os

import numpy as np
from PIL import Image, ImageDraw

OUT = "public/art"
SS = 2  # supersampling
INK = np.array([0x10, 0x1B, 0x32], dtype=float)
IVORY = np.array([0xF5, 0xF4, 0xEF], dtype=float)
rng = np.random.default_rng(2610)


def screen(tone, mask, cell=7.0, angle=45):
    """tone 0 (black) .. 1 (white), mask 0..1, both at supersampled size. Returns RGBA at final size."""
    h, w = tone.shape
    y, x = np.mgrid[0:h, 0:w].astype(float)
    a = np.deg2rad(angle)
    u = x * np.cos(a) + y * np.sin(a)
    v = -x * np.sin(a) + y * np.cos(a)
    c = cell * SS
    du = (u / c) - np.floor(u / c) - 0.5
    dv = (v / c) - np.floor(v / c) - 0.5
    d = np.sqrt(du**2 + dv**2)
    r = 0.5 * np.sqrt(2) * np.sqrt(np.clip(1 - tone, 0, 1)) * 0.98
    dot = (d < r).astype(float)
    rgb = IVORY[None, None, :] * (1 - dot[..., None]) + INK[None, None, :] * dot[..., None]
    rgba = np.dstack([rgb, mask * 255]).clip(0, 255).astype(np.uint8)
    return Image.fromarray(rgba, "RGBA").resize((w // SS, h // SS), Image.LANCZOS)


def grain(img, amount=0.07):
    """Slight paper grain: soft luminance noise mixed toward ink, alpha untouched."""
    a = np.asarray(img).astype(float)
    n = rng.standard_normal(a.shape[:2])
    n = (n + np.roll(n, 1, 0) + np.roll(n, 1, 1)) / 3  # a touch softer than pixel noise
    k = np.clip(n * amount, -1, 1)[..., None]
    rgb = a[..., :3] + k * (IVORY - INK)[None, None, :]
    lo, hi = np.minimum(INK, IVORY), np.maximum(INK, IVORY)
    rgb = np.clip(rgb, lo, hi)
    return Image.fromarray(np.dstack([rgb, a[..., 3]]).astype(np.uint8), "RGBA")


class Canvas:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.tone = np.ones((h * SS, w * SS))
        self.mask = np.zeros((h * SS, w * SS))
        yy, xx = np.mgrid[0 : h * SS, 0 : w * SS].astype(float) / SS
        self.x, self.y = xx, yy

    def region(self, draw):
        m = Image.new("L", (self.w * SS, self.h * SS), 0)
        draw(ImageDraw.Draw(m))
        return np.asarray(m, dtype=float) / 255

    def poly(self, pts, value):
        r = self.region(lambda d: d.polygon([(px * SS, py * SS) for px, py in pts], fill=255))
        self.paint(r, value)

    def ellipse(self, cx, cy, rx, ry, value):
        r = self.region(lambda d: d.ellipse([(cx - rx) * SS, (cy - ry) * SS, (cx + rx) * SS, (cy + ry) * SS], fill=255))
        self.paint(r, value)

    def rrect(self, x0, y0, x1, y1, rad, value):
        r = self.region(lambda d: d.rounded_rectangle([x0 * SS, y0 * SS, x1 * SS, y1 * SS], radius=rad * SS, fill=255))
        self.paint(r, value)

    def paint(self, region, value):
        self.tone = self.tone * (1 - region) + value * region
        self.mask = np.maximum(self.mask, region)

    def light(self, base, kx, ky=0.0):
        """A tone that brightens toward the upper left."""
        return base + kx * (0.5 - self.x / self.w) + ky * (0.5 - self.y / self.h)

    def save(self, name, cell=7.0):
        img = grain(screen(np.clip(self.tone, 0, 1), self.mask, cell=cell))
        box = img.getbbox()
        img.crop(box).save(os.path.join(OUT, name))
        print(name, img.crop(box).size)


# ---------- Laptop, open (reuses the Security, sorted art) ----------


def laptop_open():
    src = Image.open(os.path.join(OUT, "security-sorted-laptop.png")).convert("RGBA")
    img = grain(src)
    img.save(os.path.join(OUT, "series-a-laptop-open.png"))
    print("series-a-laptop-open.png", img.size)


# ---------- Laptop, closed ----------


def laptop_closed():
    c = Canvas(1300, 760)
    A = np.array([120.0, 380.0])  # back-left
    B = np.array([820.0, 150.0])  # back-right
    D = np.array([480.0, 650.0])  # front-left
    CC = B + D - A
    T = 30.0  # thickness
    down = np.array([0, T])
    # Side faces (left and front), then the lid
    c.poly([A, D, D + down, A + down], 0.5)
    c.poly([D, CC, CC + down, D + down], 0.34)
    c.poly([A, B, CC, D], c.light(0.72, 0.35, 0.2))
    # Lid seam along the front edge and the left edge
    c.poly([D + [0, T * 0.42], CC + [0, T * 0.42], CC + [0, T * 0.52], D + [0, T * 0.52]], 0.12)
    c.poly([A + [0, T * 0.42], D + [0, T * 0.42], D + [0, T * 0.52], A + [0, T * 0.52]], 0.2)
    # Soft sheen across the lid
    P = lambda s, t: A + s * (B - A) + t * (D - A)
    c.poly([P(0.42, 0), P(0.6, 0), P(0.38, 1), P(0.2, 1)], c.light(0.86, 0.2))
    # Rubber feet peeking under the front edge
    for s in (0.08, 0.92):
        p = D + s * (CC - D) + down
        c.ellipse(p[0], p[1] + 2, 16, 5, 0.1)
    c.save("series-a-laptop-closed.png")


# ---------- Filing cabinet ----------


def cabinet():
    c = Canvas(900, 1300)
    x0, x1 = 150.0, 620.0  # front face
    y0, y1 = 170.0, 1230.0
    dx, dy = 190.0, -120.0  # receding side (to the upper right)
    # Side face, top face, front face
    c.poly([(x1, y0), (x1 + dx, y0 + dy), (x1 + dx, y1 + dy), (x1, y1)], c.light(0.42, 0.2))
    c.poly([(x0, y0), (x0 + dx, y0 + dy), (x1 + dx, y0 + dy), (x1, y0)], 0.86)
    c.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], c.light(0.66, 0.25, 0.1))
    # Plinth
    c.poly([(x0 - 6, y1 - 34), (x1 + 6, y1 - 34), (x1 + 6, y1), (x0 - 6, y1)], 0.3)
    c.poly([(x1 + 6, y1 - 34), (x1 + dx, y1 + dy - 34), (x1 + dx, y1 + dy), (x1 + 6, y1)], 0.22)
    # Four drawers: recessed frame, raised front, label holder, cup pull
    gap = 18
    top = y0 + 26
    h = (y1 - 34 - top - gap * 4) / 4
    for i in range(4):
        dy0 = top + i * (h + gap)
        c.poly([(x0 + 18, dy0), (x1 - 18, dy0), (x1 - 18, dy0 + h), (x0 + 18, dy0 + h)], 0.24)  # shadow gap
        c.rrect(x0 + 24, dy0 + 4, x1 - 24, dy0 + h - 4, 6, c.light(0.76, 0.22, 0.05))
        c.poly([(x0 + 24, dy0 + h - 14), (x1 - 24, dy0 + h - 14), (x1 - 24, dy0 + h - 4), (x0 + 24, dy0 + h - 4)], 0.5)
        mx = (x0 + x1) / 2
        # Label holder (blank card in a thin frame)
        c.rrect(mx - 70, dy0 + 38, mx + 70, dy0 + 86, 4, 0.3)
        c.rrect(mx - 62, dy0 + 44, mx + 62, dy0 + 80, 2, 0.95)
        # Cup pull
        c.rrect(mx - 80, dy0 + 112, mx + 80, dy0 + 150, 18, 0.28)
        c.rrect(mx - 70, dy0 + 114, mx + 70, dy0 + 134, 10, 0.62)
        # Keyhole on the top drawer
        if i == 0:
            c.ellipse(mx, dy0 + 186, 9, 9, 0.18)
    # Edge highlight on the front-right corner
    c.poly([(x1 - 4, y0), (x1 + 3, y0 - 2), (x1 + 3, y1), (x1 - 4, y1)], 0.92)
    c.save("series-a-cabinet.png")


# ---------- Rubber stamp ----------


def stamp():
    c = Canvas(700, 1000)
    cx = 350.0
    # Rubber base: a thin dark slab with an elliptical top
    c.rrect(cx - 250, 840, cx + 250, 900, 8, 0.14)
    c.ellipse(cx, 840, 250, 46, 0.32)
    # Block handle (wooden mount): cylinder-ish with a lit left side
    c.rrect(cx - 230, 700, cx + 230, 845, 14, c.light(0.6, 0.6))
    c.ellipse(cx, 700, 230, 42, 0.82)
    c.poly([(cx - 230, 830), (cx + 230, 830), (cx + 230, 845), (cx - 230, 845)], 0.4)
    # Turned neck
    c.rrect(cx - 46, 360, cx + 46, 705, 30, c.light(0.55, 0.9))
    c.ellipse(cx, 640, 110, 30, 0.5)
    c.rrect(cx - 110, 640, cx + 110, 700, 26, c.light(0.6, 0.6))
    c.ellipse(cx, 640, 110, 30, 0.78)
    c.rrect(cx - 46, 520, cx + 46, 650, 30, c.light(0.55, 0.9))
    c.ellipse(cx, 430, 70, 20, 0.45)
    c.rrect(cx - 70, 400, cx + 70, 445, 18, c.light(0.58, 0.6))
    # Knob: a sphere lit from the upper left
    r = 150
    ky = 250
    d = np.sqrt((c.x - (cx - 50)) ** 2 + (c.y - (ky - 55)) ** 2) / (r * 1.6)
    c.ellipse(cx, ky, r, r * 0.92, np.clip(0.95 - 0.85 * d, 0.1, 1))
    c.ellipse(cx - 52, ky - 58, 34, 24, 0.97)
    c.save("series-a-stamp.png")


os.makedirs(OUT, exist_ok=True)
laptop_open()
laptop_closed()
cabinet()
stamp()
