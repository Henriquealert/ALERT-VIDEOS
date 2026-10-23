"""Original halftone cut-out artwork for the "Security, sorted." video. No photos, no stock, no logos.

Each object is drawn as flat grey tones, then screened into a newspaper-style halftone:
Deep Ink dots on a Soft Ivory paper base, cut out on a transparent background (no white edge).

  public/art/security-sorted-token-tpm.png          round metal token stamped "TPM 2.0"
  public/art/security-sorted-token-bitlocker.png    round metal token stamped "BITLOCKER"
  public/art/security-sorted-token-secureboot.png   round metal token stamped "SECURE BOOT"
  public/art/security-sorted-laptop.png             unbranded business laptop, half-open
  public/art/security-sorted-monogram-ink.png       the a! cut from the supplied Ink wordmark (no redrawing)

Token text is set in Archivo Narrow Bold from public/fonts/ (brand font).
The laptop deck anchors used by the video (LAPTOP_SPOTS in src/videos/SecuritySorted.tsx) are
computed from the deck geometry below and printed when the script runs.

Run: python3 scripts/make-halftone-cutouts.py
Needs numpy and Pillow.
"""

import os

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = "public/art"
SS = 2  # supersampling
INK = np.array([0x10, 0x1B, 0x32], dtype=float)
IVORY = np.array([0xF5, 0xF4, 0xEF], dtype=float)
FONT = "public/fonts/Archivo Narrow/static/ArchivoNarrow-Bold.ttf"


def screen(tone, mask, cell=7.0, angle=45):
    """tone 0 (black) .. 1 (white), mask 0..1, both at supersampled size. Returns RGBA uint8 at final size."""
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
    img = Image.fromarray(rgba, "RGBA")
    return img.resize((w // SS, h // SS), Image.LANCZOS)


def poly_mask(size, pts):
    m = Image.new("L", size, 0)
    ImageDraw.Draw(m).polygon([(px * SS, py * SS) for px, py in pts], fill=255)
    return np.asarray(m, dtype=float) / 255


def paint(tone, mask, region, value):
    """Paint `value` (scalar or array) into tone where region is set; grow the cut-out mask."""
    tone[:] = tone * (1 - region) + value * region
    mask[:] = np.maximum(mask, region)


# ---------- Tokens ----------


def token(label_lines, name, size=640):
    S = size * SS
    y, x = np.mgrid[0:S, 0:S].astype(float) / S - 0.5
    r = np.sqrt(x**2 + y**2)
    mask = np.clip((0.49 - r) * S, 0, 1)
    # Brushed-metal face: diagonal light, a soft specular band, darker toward the rim.
    face = 0.8 + 0.26 * (-(x + y)) - 0.25 * r
    face += 0.18 * np.exp(-(((x - y) * 0.9 + 0.05) ** 2) / 0.004)
    tone = face.copy()
    rim = (r > 0.41) & (r < 0.49)
    tone[rim] = (0.58 + 0.4 * (-(x + y)))[rim]
    groove = (r > 0.395) & (r < 0.41)
    tone[groove] = 0.18
    inner = (r > 0.345) & (r < 0.355)
    tone[inner] = 0.3
    # Stamped label: dark letters with a light lower-right lip (embossed look).
    fs = S * (0.2 if len(label_lines) == 1 else 0.17)
    widest = max(ImageFont.truetype(FONT, 100).getlength(l) for l in label_lines) / 100
    font = ImageFont.truetype(FONT, int(min(fs, S * 0.56 / widest)))
    txt = Image.new("L", (S, S), 0)
    lip = Image.new("L", (S, S), 0)
    lh = font.size * 1.0
    y0 = S / 2 - lh * len(label_lines) / 2
    for i, line in enumerate(label_lines):
        tw = font.getlength(line)
        pos = (S / 2 - tw / 2, y0 + i * lh - font.size * 0.12)
        ImageDraw.Draw(txt).text(pos, line, fill=255, font=font)
        ImageDraw.Draw(lip).text((pos[0] + 0.006 * S, pos[1] + 0.008 * S), line, fill=255, font=font)
    t = np.asarray(txt, dtype=float) / 255
    lp = np.asarray(lip, dtype=float) / 255
    tone = tone * (1 - lp) + 0.97 * lp
    tone = tone * (1 - t) + 0.12 * t
    img = screen(np.clip(tone, 0, 1), mask, cell=6.5)
    img.save(os.path.join(OUT, f"security-sorted-token-{name}.png"))


# ---------- Laptop ----------

W, H = 1600, 1150
A = np.array([250.0, 620.0])  # deck back-left (hinge)
B = np.array([1080.0, 440.0])  # deck back-right (hinge)
D = np.array([560.0, 860.0])  # deck front-left
CC = B + D - A  # deck front-right
LID = np.array([10.0, -380.0])  # hinge -> lid top, half-open
THICK = 34.0
CROP = (220, 30, 1420, 930)


def P(s, t):
    return A + s * (B - A) + t * (D - A)


def laptop():
    size = (W * SS, H * SS)
    tone = np.ones((H * SS, W * SS))
    mask = np.zeros((H * SS, W * SS))
    yy, xx = np.mgrid[0 : H * SS, 0 : W * SS].astype(float) / SS
    grad = lambda base, k: base + k * ((xx - 800) / 1600 - (yy - 575) / 1150)  # light from the upper left

    # Lid back edge (thickness) and lid face
    lt = [A + LID, B + LID, B + LID + np.array([6, -14]), A + LID + np.array([6, -14])]
    paint(tone, mask, poly_mask(size, lt), 0.45)
    lid = [A, B, B + LID, A + LID]
    paint(tone, mask, poly_mask(size, lid), grad(0.5, -0.2))
    q = lambda s, t: A + s * (B - A) + t * LID  # point on the lid plane
    screen_q = [q(0.035, 0.06), q(0.965, 0.06), q(0.965, 0.93), q(0.035, 0.93)]
    scr = 0.16 + 0.1 * ((xx - 600) / 900)
    paint(tone, mask, poly_mask(size, screen_q), scr)
    # A soft diagonal reflection across the glass
    refl = poly_mask(size, [q(0.55, 0.93), q(0.72, 0.93), q(0.42, 0.06), q(0.25, 0.06)]) * poly_mask(size, screen_q)
    paint(tone, mask, refl, 0.34)

    # Deck: left face, front face, top
    paint(tone, mask, poly_mask(size, [A, D, D + [0, THICK], A + [0, THICK]]), 0.58)
    paint(tone, mask, poly_mask(size, [D, CC, CC + [0, THICK], D + [0, THICK]]), 0.4)
    paint(tone, mask, poly_mask(size, [A, B, CC, D]), grad(0.8, 0.22))
    # Keyboard well and keys
    well = [P(0.06, 0.07), P(0.94, 0.07), P(0.94, 0.5), P(0.06, 0.5)]
    paint(tone, mask, poly_mask(size, well), 0.28)
    cols, rows = 14, 5
    for rr in range(rows):
        for cc in range(cols):
            s0 = 0.075 + cc * (0.85 / cols)
            t0 = 0.09 + rr * (0.39 / rows)
            k = [P(s0, t0), P(s0 + 0.85 / cols - 0.008, t0), P(s0 + 0.85 / cols - 0.008, t0 + 0.39 / rows - 0.018), P(s0, t0 + 0.39 / rows - 0.018)]
            paint(tone, mask, poly_mask(size, k), 0.6)
    # Trackpad
    pad = [P(0.42, 0.6), P(0.6, 0.6), P(0.6, 0.9), P(0.42, 0.9)]
    paint(tone, mask, poly_mask(size, pad), 0.66)
    # Hinge line
    hinge = [A + [0, -4], B + [0, -4], B + [0, 6], A + [0, 6]]
    paint(tone, mask, poly_mask(size, hinge), 0.25)

    img = screen(np.clip(tone, 0, 1), mask, cell=7.0)
    img.crop(CROP).save(os.path.join(OUT, "security-sorted-laptop.png"))

    cw, ch = CROP[2] - CROP[0], CROP[3] - CROP[1]
    print("Laptop", cw, "x", ch)
    for s in (0.15, 0.29, 0.78):
        p = P(s, 0.76)
        print(f"  spot s={s}: x={(p[0] - CROP[0]) / cw:.3f} y={(p[1] - CROP[1]) / ch:.3f}")


# ---------- Monogram ----------


def monogram():
    src = Image.open("public/brand/alert-global-tech-wordmark-ink.png")
    a = np.asarray(src)[..., 3]
    # The a! is the artwork left of the first empty column after the "!" stem.
    cols = a.max(axis=0) > 0
    x = 0
    while cols[x]:
        x += 1
    while not cols[x]:
        x += 1  # gap between a and !
    while cols[x]:
        x += 1  # through the !
    box = src.crop((0, 0, x, src.height)).getbbox()
    src.crop((0, 0, x, src.height)).crop(box).save(os.path.join(OUT, "security-sorted-monogram-ink.png"))
    print("Monogram", box)


os.makedirs(OUT, exist_ok=True)
token(["TPM 2.0"], "tpm")
token(["BITLOCKER"], "bitlocker")
token(["SECURE", "BOOT"], "secureboot")
laptop()
monogram()
