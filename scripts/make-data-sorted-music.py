"""Original instrumental for the "Data, sorted." explainer. No samples, no vocals.

Light, bouncy ambient bed with a soft rhythmic pulse: 120 BPM, 4/4, 30 bars of 2 s (60 s),
48 kHz stereo. Beat = 0.5 s = 15 video frames at 30 fps.

  0-5 s    hook: pad and a soft bell, staccato pluck on the off-beats
  5-37 s   questions, the error, the cost: felt pulse on every beat, shaker, bouncy pluck arpeggio
  37-49 s  the fix: lift - sub bass, brighter arpeggio an octave up, a little louder
  49-60 s  close: biggest section, bell on 0:49, resolves to C on 0:57 and rings out

Run: python3 scripts/make-data-sorted-music.py "public/audio/Alert Global Tech - Data Sorted Music.wav"
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
BARS = 30
N = int(BARS * BAR * SR)
rng = np.random.default_rng(4960)

L = np.zeros(N)
R = np.zeros(N)


def at(t):
    return int(round(t * SR))


def add(sig, t, gain=1.0, pan=0.0):
    i = at(t)
    if i >= N:
        return
    sig = sig[: N - i] * gain
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
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = 55 + 45 * np.exp(-t / 0.04)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.14)
    body *= np.minimum(1, t / 0.003)
    return filt(body, "lowpass", 200)


def shaker():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.01) * np.exp(-t / 0.025)
    return filt(rng.standard_normal(n), "bandpass", [5500, 10000]) * e


def snap():
    # Soft finger-snap-like tick for the backbeat (no clap)
    n = int(0.12 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "bandpass", [1500, 4000]) * np.minimum(1, t / 0.002) * np.exp(-t / 0.03)


def pad(freqs, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for d in (-0.003, 0.003):
            ph = 2 * np.pi * f * (1 + d) * t
            out += np.sin(ph) + 0.25 * np.sin(2 * ph)
    out = filt(out / (2 * len(freqs)), "lowpass", 1600)
    return out * adsr(n, 0.3, 0.4, 0.8, 0.5)


def pluck(f, length=0.22):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(4 * np.pi * f * t) + 0.1 * np.sin(6 * np.pi * f * t)
    return filt(tone * np.minimum(1, t / 0.002) * np.exp(-t / 0.07), "lowpass", 3200)


def sub(f, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    return np.tanh(1.2 * np.sin(2 * np.pi * f * t)) * adsr(n, 0.02, 0.15, 0.6, 0.12)


def bell(f, length=2.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.9 / m)) for m, a in ((1, 1), (2.76, 0.35), (5.4, 0.12)))
    return tone * np.minimum(1, t / 0.002)


# Bright I-V-vi-IV in C, one chord per bar
CHORDS = {
    "C": ("C2", ["E3", "G3", "C4", "E4"], ["C5", "E5", "G5", "E5"]),
    "G": ("G1", ["D3", "G3", "B3", "D4"], ["B4", "D5", "G5", "D5"]),
    "Am": ("A1", ["E3", "A3", "C4", "E4"], ["A4", "C5", "E5", "C5"]),
    "F": ("F1", ["F3", "A3", "C4", "F4"], ["A4", "C5", "F5", "C5"]),
}
LOOP = ["C", "G", "Am", "F"]
PROG = [LOOP[b % 4] for b in range(BARS)]
PROG[-2:] = ["C", "C"]  # resolve on 0:56

K, SH, SN = felt_kick(), shaker(), snap()
for bar, name in enumerate(PROG):
    t0 = bar * BAR
    root, chord, arp = CHORDS[name]
    sec = t0 / 1.0
    hook = sec < 5
    lift = sec >= 37
    close = sec >= 49
    ending = bar >= BARS - 2
    for pan in (-0.12, 0.12):
        add(pad([note(x) for x in chord], BAR + 0.4), t0, 0.26 + (0.05 if lift else 0), pan=pan)
    if ending:
        continue
    if not hook:
        for b in range(4):
            add(K, t0 + b * BEAT, 0.42 + (0.08 if lift else 0))
            if b in (1, 3):
                add(SN, t0 + b * BEAT, 0.10 + (0.04 if close else 0), pan=0.2)
        for e in range(8):
            add(SH, t0 + e * BEAT / 2 + 0.01, 0.05 if e % 2 else 0.08, pan=-0.3)
    # Bouncy 8th-note pluck arpeggio; staccato off-beats only during the hook
    up = 2 if lift else 1
    for e in range(8):
        if hook and e % 2 == 0:
            continue
        f = note(arp[e % 4]) * up
        add(pluck(f), t0 + e * BEAT / 2, 0.14 if e % 2 else 0.18, pan=0.25 if e % 2 else -0.25)
    if lift:
        for b in (0, 1.5, 2, 3.5):
            add(sub(note(root) * 2, 0.4), t0 + b * BEAT, 0.22)

add(bell(note("E6"), 2.5), 0.0, 0.09, pan=0.15)
add(bell(note("G5"), 2.5), 37.0, 0.08, pan=-0.15)
add(bell(note("C6"), 3.0), 49.0, 0.10, pan=0.15)
t_res = (BARS - 2) * BAR
add(sub(note("C2") * 2, 3.5), t_res, 0.28)
add(bell(note("C5"), 4.0), t_res, 0.12, pan=-0.15)
add(K, t_res, 0.4)

mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.05)
mix /= np.max(np.abs(mix)) / 10 ** (-9 / 20)
fade = int(2.0 * SR)
mix[-fade:] *= (np.linspace(1, 0, fade) ** 1.5)[:, None]

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"Wrote {out}: {N / SR:.3f} s, {SR} Hz stereo, {BPM} BPM")
