"""Original soundtrack for the "Series A, sorted." promo (src/videos/SeriesAPromo.tsx). No samples, no vocals, no voiceover.

Minimal, confident electronic beat: exactly 120 BPM, 4/4, 30 s, 48 kHz stereo. Every cut lands on a beat.

  0-4    statement: kick on the beat, a stab as each word lands, a low hit as the collage tumbles in
  4-19   four-on-the-floor kick, off-beat hats, tight bass, clap on 2 and 4; a stab on every cut;
         soft key ticks while the sentence types, a thud when the stamp hits, ticks as the cards land,
         stabs on the kinetic words, a riser into the card flip
  19-25  title card: half-time, arp; a tick for each product name
  25-30  end card: one chord, kick on the downbeat, rings out

Hit frames (30 fps) match the constants in src/videos/SeriesAPromo.tsx.

Run: python3 scripts/make-series-a-promo-audio.py "public/audio/Alert Global Tech - Series A Sorted Promo Music.wav"
Needs numpy and scipy.
"""

import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM
DUR = 30.0
N = int(DUR * SR)
rng = np.random.default_rng(2410)
FPS = 30

SCENES = [0, 120, 270, 420, 570, 750]  # frames
WORDS = [0, 30, 60] + [420 + f for f in (0, 15, 30, 60, 75, 90)]  # S1_WORDS, S4_WORDS
TUMBLE = [62, 66, 70, 75, 82]
TYPING = (123, 172)  # scene 2 typing (frames)
BOX = 180  # S2_BOX
STAMP = 225  # S2_STAMP
CARDS = [285, 300, 315, 330]  # S3_CARDS
FLIP = 510  # S4_FLIP
ITEMS = [570 + b * 15 for b in range(3, 9)]  # S5_ITEMS
END = 750 / FPS

L = np.zeros(N)
R = np.zeros(N)


def at(t):
    return int(round(t * SR))


def add(sig, t, gain=1.0, pan=0.0):
    i = at(t)
    sig = sig[: max(0, N - i)] * gain
    a = (pan + 1) * np.pi / 4
    L[i : i + len(sig)] += sig * np.cos(a)
    R[i : i + len(sig)] += sig * np.sin(a)


def filt(x, kind, freq, order=2):
    return sosfilt(butter(order, freq, btype=kind, fs=SR, output="sos"), x)


def env(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)


def note(name):
    names = {"C": -9, "D": -7, "Eb": -6, "E": -5, "F": -4, "G": -2, "Ab": -1, "A": 0, "Bb": 1, "B": 2}
    letter, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[letter] + 12 * (octave - 4)) / 12)


def kick():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = 48 + 90 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14)
    click = filt(rng.standard_normal(n), "highpass", 3000) * np.exp(-t / 0.003) * 0.15
    return np.tanh(1.6 * (body + click))


def hat(length=0.05):
    n = int(length * SR)
    return filt(rng.standard_normal(n), "highpass", 7500) * env(n, 0.001, length / 4)


def stab(freqs):
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    tone = sum(np.sign(np.sin(2 * np.pi * f * t)) * 0.5 + np.sin(2 * np.pi * f * 1.005 * t) for f in freqs) / len(freqs)
    return filt(tone, "lowpass", 2200) * env(n, 0.002, 0.07)


def bass(f, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = np.tanh(2.0 * np.sin(2 * np.pi * f * t) + 0.4 * np.sin(4 * np.pi * f * t))
    return filt(tone, "lowpass", 600) * env(n, 0.003, length / 2.5)


def pluck(f, length=0.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * t) + 0.4 * np.sin(6 * np.pi * f * t)
    return filt(tone, "lowpass", 3500) * env(n, 0.002, 0.06)


def tick():
    """Soft metallic tick: short inharmonic partials over a tiny noise click."""
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    tone = sum(a * np.sin(2 * np.pi * f * t) * np.exp(-t / d) for f, a, d in ((2380, 1, 0.035), (3710, 0.6, 0.022), (5930, 0.35, 0.014), (8120, 0.2, 0.008)))
    click = filt(rng.standard_normal(n), "bandpass", [3000, 9000]) * np.exp(-t / 0.002) * 0.6
    return (tone + click) * np.minimum(1, t / 0.0005)


def low_hit(length=1.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t / 0.05)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.55)
    thump = filt(rng.standard_normal(n), "lowpass", 260) * np.exp(-t / 0.06) * 0.8
    return np.tanh(1.4 * (boom + thump))


def pad(freqs, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = sum(np.sin(2 * np.pi * f * (1 + d) * t) for f in freqs for d in (-0.003, 0.003)) / (2 * len(freqs))
    return filt(out, "lowpass", 1800) * np.minimum(1, t / 0.02) * np.exp(-t / 1.6)



def clap():
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    burst = sum(np.exp(-np.maximum(0, t - d) / 0.012) * (t >= d) for d in (0, 0.009, 0.018))
    return filt(rng.standard_normal(n), "bandpass", [900, 5000]) * (burst * 0.5 + np.exp(-t / 0.06) * 0.4)


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "highpass", 2500) * (t / length) ** 2


def f2t(fr):
    return fr / FPS


K = kick()
ROOTS = ["D2", "D2", "Bb1", "C2"]  # D minor, one bar per root
CHORD = [note("D4"), note("F4"), note("A4")]

# 0-4: kick on every beat, low pulse
for b in range(8):
    add(K, b * BEAT, 0.65)
    add(bass(note("D2"), 0.22), b * BEAT, 0.22)
for b in (1, 3, 5, 7):
    add(hat(), b * BEAT + BEAT / 2, 0.08, pan=0.25)

# 4-19: the groove
t = f2t(SCENES[1])
bar = 0
while t < f2t(SCENES[4]) - 1e-6:
    root = note(ROOTS[bar % 4])
    for b in range(4):
        tb = t + b * BEAT
        add(K, tb, 0.7)
        add(hat(), tb + BEAT / 2, 0.15, pan=0.25)
        add(hat(0.02), tb + BEAT / 4, 0.05, pan=-0.3)
        add(hat(0.02), tb + 3 * BEAT / 4, 0.04, pan=-0.3)
        if b % 2 == 1:
            add(clap(), tb, 0.22, pan=-0.05)
        for e in range(2):
            add(bass(root * (2 if e else 1), 0.2), tb + e * BEAT / 2, 0.3)
    t += 4 * BEAT
    bar += 1

# 19-25: half-time with an arp
t = f2t(SCENES[4])
bar = 0
while t < END - 1e-6:
    root = note(ROOTS[bar % 4])
    for b in range(4):
        tb = t + b * BEAT
        if b in (0, 2):
            add(K, tb, 0.6)
        if b == 2:
            add(clap(), tb, 0.2)
        add(hat(), tb + BEAT / 2, 0.11, pan=0.25)
        add(bass(root, 0.4), tb, 0.26)
        arp = [root * 4, root * 4 * 1.19, root * 4 * 1.5, root * 8]
        for e in range(4):
            add(pluck(arp[e]), tb + e * BEAT / 4, 0.07, pan=0.3 if e % 2 else -0.3)
    t += 4 * BEAT
    bar += 1

# Hits
for fr in SCENES[1:5]:
    add(stab(CHORD), f2t(fr), 0.22)
for fr in WORDS:
    add(stab([c * 0.5 for c in CHORD]), f2t(fr), 0.2)
add(low_hit(1.2), f2t(TUMBLE[0]) - 0.05, 0.55)
for fr in TUMBLE[1:]:
    add(tick(), f2t(fr), 0.12, pan=0.4 if fr % 2 else -0.4)
for fr in range(TYPING[0], TYPING[1], 3):
    add(hat(0.012), f2t(fr), 0.05, pan=rng.uniform(-0.3, 0.3))
add(stab(CHORD), f2t(BOX), 0.16)
add(low_hit(0.8), f2t(STAMP), 0.75)
for fr in CARDS + ITEMS:
    add(tick(), f2t(fr), 0.2, pan=0.1)
add(riser(0.9), f2t(FLIP) - 0.9, 0.12)
add(stab(CHORD), f2t(FLIP), 0.2)

# End card: one chord, kick on the downbeat, rings out
add(K, END, 0.55)
add(pad([note("D3"), note("F3"), note("A3"), note("C4")], 5.0), END, 0.45)
add(bass(note("D2"), 2.5), END, 0.3)
for b in range(1, 8):
    add(hat(0.03), END + b * BEAT, 0.05, pan=0.25)

# Master: soft limit to -1 dBFS peak, fade the last 0.8 s
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) / 10 ** (-1 / 20)
fade = int(0.8 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"Wrote {out}: {N / SR:.3f} s, {SR} Hz stereo, {BPM} BPM")
