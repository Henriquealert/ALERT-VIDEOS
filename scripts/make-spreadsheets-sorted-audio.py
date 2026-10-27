"""Original track for "Spreadsheets, sorted." No samples, no vocals, no voiceover.

Minimal, dry percussion at exactly 120 BPM, 4/4, 10 bars of 2 s (20 s), 48 kHz stereo:

  0:00-3:50    low kick on every beat, nothing else: the hook
  3:50-17:00   kick on every beat, dry clap on 2 and 4, a closed tick on the off-beats from 8:00
  17:00-20:00  the end card: one kick on 17:00, then a single soft synth chord on "sorted" (17:50)
               that rings out to 20:00. The only pitched part of the film.

On top: one short, dry "tok" (a woodblock) each time a shape, tab or dot lands. TOKS below are
the landing cues in src/videos/SpreadsheetsSorted.tsx; keep the two in step.

Run: python3 scripts/make-spreadsheets-sorted-audio.py "public/audio/Alert Global Tech - Spreadsheets Sorted Music.wav"
Needs numpy and scipy.
"""

import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
BEAT = 0.5
N = 20 * SR
rng = np.random.default_rng(2610)

# Landing cues, in seconds (video frame = seconds x 30).
TOKS = [
    0.5,  # ivory panel
    4.0, 4.5, 5.0, 5.5, 6.0,  # five tabs
    7.2,  # dot
    8.5, 9.0, 9.5, 10.0,  # four shapes
    10.7, 10.95,  # gaps close, open
    11.2,  # dot
    14.0, 14.2,  # blue block, notch
    15.0,  # dot
    15.5,  # ink disc
    17.7,  # dot
    18.0,  # button
]
SORTED = 17.5

L = np.zeros(N)
R = np.zeros(N)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    sig = sig[: max(0, N - i)] * gain
    a = (pan + 1) * np.pi / 4
    L[i : i + len(sig)] += sig * np.cos(a)
    R[i : i + len(sig)] += sig * np.sin(a)


def filt(x, kind, freq, order=2):
    return sosfilt(butter(order, freq, btype=kind, fs=SR, output="sos"), x)


def kick():
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = 46 + 90 * np.exp(-t / 0.03)
    return np.tanh(1.3 * np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.12))


def clap():
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    env = np.zeros(n)
    for k, off in enumerate((0.0, 0.009, 0.018)):
        i = int(off * SR)
        env[i:] += np.exp(-t[: n - i] / (0.005 if k < 2 else 0.03))  # short tail: dry
    return filt(rng.standard_normal(n), "bandpass", [1000, 3000]) * env * 0.6


def tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "highpass", 8000) * np.exp(-t / 0.006)


def tok():
    # Dry woodblock: two inharmonic partials, ~40 ms, no room.
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * 1050 * t) + 0.5 * np.sin(2 * np.pi * 2540 * t)
    return tone * np.exp(-t / 0.011) * np.minimum(1, t / 0.0005)


def chord(freqs, length):
    # Soft synth chord: detuned sines with a little 2nd harmonic, slow attack, long ring.
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for d in (-0.0025, 0.0025):
            ph = 2 * np.pi * f * (1 + d) * t
            out += np.sin(ph) + 0.18 * np.sin(2 * ph)
    out = filt(out / (2 * len(freqs)), "lowpass", 2200)
    return out * np.minimum(1, t / 0.06) * np.exp(-t / 2.2)


K, CL = kick(), clap()
for b in range(int(17.0 / BEAT)):
    t = b * BEAT
    add(K, t, 0.75)
    if t >= 3.5 and b % 2 == 1:
        add(CL, t, 0.4, pan=0.05)
    if t >= 8.0:
        add(tick(), t + BEAT / 2, 0.08, pan=0.3)
add(K, 17.0, 0.9)

for t in TOKS:
    add(tok(), t, 0.5, pan=-0.15)

# Fmaj9 voicing on "sorted", ringing to the end.
hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)
add(chord([hz(m) for m in (41, 53, 57, 60, 64, 67)], 20 - SORTED), SORTED, 0.5)

mix = np.tanh(np.stack([L, R], axis=1) * 1.1)
mix /= np.max(np.abs(mix)) / 10 ** (-1 / 20)
fade = int(0.4 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"Wrote {out}: {N / SR:.3f} s, {SR} Hz stereo, 120 BPM")
