"""Original instrumental for the "Tech updates for you" Windows 11 video. No samples, no vocals.

Calm bed for a voiceover: exactly 120 BPM, 4/4, 15 bars of 2 s (30 s), 48 kHz stereo.
Soft on purpose: no clap, a felt kick (low-passed, no click) on beats 1 and 3 only,
quiet shaker, warm pad, a gentle pluck arpeggio and a round sub bass.

  Bars 1-2   (0-4 s)    opener: pad and a soft bell on the downbeat
  Bars 3-5   (4-10 s)   the pressure: felt kick and shaker come in
  Bars 6-13  (10-26 s)  the answer: sub bass and pluck arpeggio join (a lift, not a drop)
  Bars 14-15 (26-30 s)  resolve on 0:26 to F, bell, everything rings out to 0:30

Every hit sits on an exact sample index (beat = 24000 samples = 12 video frames at 24 fps).

Run: python3 scripts/make-story-music.py "public/audio/Alert Global Tech - Tech Updates Windows 11 Music.wav"
Needs numpy and scipy.
"""

import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 15
N = int(BARS * BAR * SR)
rng = np.random.default_rng(1120)

L = np.zeros(N)
R = np.zeros(N)


def at(t):
    return int(round(t * SR))


def add(sig, t, gain=1.0, pan=0.0, duck=None):
    i = at(t)
    sig = sig[: max(0, N - i)] * gain
    if duck is not None:
        sig = sig * duck[i : i + len(sig)]
    a = (pan + 1) * np.pi / 4
    L[i : i + len(sig)] += sig * np.cos(a)
    R[i : i + len(sig)] += sig * np.sin(a)


def filt(x, kind, freq, order=2):
    return sosfilt(butter(order, freq, btype=kind, fs=SR, output="sos"), x)


def adsr(n, a, d, s, r):
    e = np.full(n, float(s))
    ia, id_, ir = int(a * SR), int(d * SR), int(r * SR)
    e[:ia] = np.linspace(0, 1, ia) if ia else e[:ia]
    seg = e[ia : ia + id_]
    e[ia : ia + id_] = np.linspace(1, s, len(seg))
    if ir:
        e[-ir:] *= np.linspace(1, 0, ir)
    return e


def note(name):
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "Bb": 1, "B": 2}
    letter, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[letter] + 12 * (octave - 4)) / 12)


def felt_kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 52 + 38 * np.exp(-t / 0.05)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18)
    body *= np.minimum(1, t / 0.004)  # soft attack, no click
    return filt(body, "lowpass", 180)


def shaker():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.012) * np.exp(-t / 0.03)
    return filt(rng.standard_normal(n), "bandpass", [5000, 9000]) * e


def pad(freqs, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for d in (-0.003, 0.003):
            ph = 2 * np.pi * f * (1 + d) * t
            out += np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    out = filt(out / (2 * len(freqs)), "lowpass", 1400)
    return out * adsr(n, 0.35, 0.4, 0.8, 0.5)


def pluck(f, length=0.4):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * t) + 0.3 * np.sin(4 * np.pi * f * t)
    return filt(tone * np.minimum(1, t / 0.003) * np.exp(-t / 0.12), "lowpass", 2500)


def sub(f, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    return np.tanh(1.2 * np.sin(2 * np.pi * f * t)) * adsr(n, 0.06, 0.3, 0.7, 0.25)


def bell(f, length=2.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.9 / m)) for m, a in ((1, 1), (2.76, 0.35), (5.4, 0.12)))
    return tone * np.minimum(1, t / 0.002)


CHORDS = {
    "Fmaj7": ("F2", ["F3", "A3", "C4", "E4"]),
    "Am7": ("A1", ["E3", "G3", "A3", "C4"]),
    "Dm7": ("D2", ["F3", "A3", "C4", "D4"]),
    "Bbmaj7": ("Bb1", ["F3", "A3", "Bb3", "D4"]),
    "C": ("C2", ["E3", "G3", "C4", "E4"]),
    "F": ("F2", ["F3", "A3", "C4", "F4"]),
}
PROG = ["Fmaj7", "Am7", "Dm7", "Bbmaj7", "Fmaj7", "C", "Dm7", "Bbmaj7", "F", "Am7", "Dm7", "Bbmaj7", "C", "F", "F"]

duck = np.ones(N)  # gentle sidechain so the pad breathes with the kick
K, SH = felt_kick(), shaker()

for bar, name in enumerate(PROG):
    t0 = bar * BAR
    root, chord = CHORDS[name]
    groove = 2 <= bar <= 12
    lift = 5 <= bar <= 12
    if groove:
        for b in (0, 2):  # half-time feel: beats 1 and 3
            add(K, t0 + b * BEAT, 0.55)
            i = at(t0 + b * BEAT)
            m = min(N - i, int(BEAT * SR))
            duck[i : i + m] = np.minimum(duck[i : i + m], 1 - 0.25 * np.exp(-np.arange(m) / SR / 0.15))
        for e in range(8):
            add(SH, t0 + e * BEAT / 2, 0.10 if e % 2 else 0.05, pan=0.3)
    if lift:
        add(sub(note(root), BAR - 0.05), t0, 0.35)
        arp = [note(x) * 2 for x in chord]  # an octave up
        for e in range(8):
            add(pluck(arp[[0, 1, 2, 3, 2, 1, 2, 3][e]]), t0 + e * BEAT / 2, 0.09, pan=-0.25 if e % 2 else 0.25)

for bar, name in enumerate(PROG[:13]):
    root, chord = CHORDS[name]
    for pan in (-0.1, 0.1):
        add(pad([note(x) for x in chord], BAR + 0.5), bar * BAR, 0.32, pan=pan, duck=duck)

# Opener bell, and the resolve on 0:26 ringing out to 0:30
add(bell(note("C6"), 2.5), 0.0, 0.10, pan=0.15)
t_res = 13 * BAR
root, chord = CHORDS["F"]
for pan in (-0.1, 0.1):
    add(pad([note(x) for x in chord], 4.0), t_res, 0.34, pan=pan)
add(sub(note(root), 3.8), t_res, 0.32)
add(bell(note("F5"), 3.8), t_res, 0.12, pan=-0.15)
add(K, t_res, 0.45)

# Master: soft limit, quiet level for a bed under a voice, fade the last 1.5 s to silence
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.05)
mix /= np.max(np.abs(mix)) / 10 ** (-9 / 20)
fade = int(1.5 * SR)
mix[-fade:] *= (np.linspace(1, 0, fade) ** 1.5)[:, None]

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"Wrote {out}: {N / SR:.3f} s, {SR} Hz stereo, {BPM} BPM")
