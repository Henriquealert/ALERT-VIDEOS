"""Original soundtrack for the "Security, sorted." video. No samples, no vocals, no voiceover.

Tight minimal electronic bed: exactly 120 BPM, 4/4, 22 s, 48 kHz stereo. Every cut lands on a beat.

  0.0-3.5   statement: kick on 1 and 3, low pulse; a metallic tick as each token lands
  3.5-17.5  four-on-the-floor kick, off-beat hats, tight bass; a short stab on every cut
            (3.5, 7.0, 10.0, 13.5); arp joins at 13.5; ticks as the tokens click onto the laptop
  17.5      everything stops: a single low hit under the monogram
  19.0-22.0 end card: one chord, kick on the downbeat, rings out to 22.0

Token times match src/videos/SecuritySorted.tsx (TOKEN_LAND and TOKEN_CLICK, in frames at 30 fps).

Run: python3 scripts/make-security-sorted-audio.py "public/audio/Alert Global Tech - Security Sorted Music.wav"
Needs numpy and scipy.
"""

import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM
DUR = 22.0
N = int(DUR * SR)
rng = np.random.default_rng(2217)

FPS = 30
TOKEN_LAND = [81, 92, 102]  # shot 1 landings
TOKEN_CLICK = [339, 357, 375]  # shot 4 clicks onto the deck
CUTS = [3.5, 7.0, 10.0, 13.5]
HIT = 17.5
END = 19.0

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


K = kick()
# Bass line in C minor, one bar (4 beats) per root, 8th notes.
ROOTS = ["C2", "C2", "Ab1", "Bb1"]

# 0.0-3.5: kick on 1 and 3, a low pulse on the beat
for b in range(7):
    t = b * BEAT
    if b % 2 == 0:
        add(K, t, 0.6)
    add(bass(note("C2"), 0.22), t, 0.25)

# 3.5-17.5: the groove
t = 3.5
bar = 0
while t < HIT - 1e-6:
    root = note(ROOTS[bar % 4])
    for b in range(4):
        tb = t + b * BEAT
        if tb >= HIT - 1e-6:
            break
        add(K, tb, 0.7)
        add(hat(), tb + BEAT / 2, 0.16, pan=0.25)
        add(hat(0.02), tb + BEAT / 4, 0.05, pan=-0.3)
        for e in range(2):
            add(bass(root * (2 if e else 1), 0.2), tb + e * BEAT / 2, 0.32)
        if tb >= 13.5 - 1e-6:
            arp = [root * 4, root * 4 * 1.19, root * 4 * 1.5, root * 8]
            for e in range(4):
                add(pluck(arp[e]), tb + e * BEAT / 4, 0.08, pan=0.3 if e % 2 else -0.3)
    t += 4 * BEAT
    bar += 1

for c in CUTS:
    add(stab([note("C4"), note("Eb4"), note("G4")]), c, 0.22)

for fr in TOKEN_LAND + TOKEN_CLICK:
    add(tick(), fr / FPS, 0.22, pan=0.1)

add(low_hit(), HIT, 0.9)

# End card: one chord, kick on the downbeat, rings out
add(K, END, 0.55)
add(pad([note("C3"), note("Eb3"), note("G3"), note("Bb3")], 3.0), END, 0.45)
add(bass(note("C2"), 2.0), END, 0.3)
for b in range(1, 6):
    add(hat(0.03), END + b * BEAT, 0.06, pan=0.25)

# Master: soft limit to -1 dBFS peak, fade the last 0.6 s
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) / 10 ** (-1 / 20)
fade = int(0.6 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"Wrote {out}: {N / SR:.3f} s, {SR} Hz stereo, {BPM} BPM")
