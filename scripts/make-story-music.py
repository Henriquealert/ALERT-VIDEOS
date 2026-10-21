"""Original instrumental for the Story Cards video. No samples, no vocals.

Exactly 120 BPM, 4/4, 10 bars of 2 s (20 s total), 48 kHz stereo.
  Bars 1-4  (0-8 s)   sparse: kick on every beat, closed hats on the offbeats
  Bars 5-9  (8-18 s)  full drop on 0:08: kick, clap on 2 and 4, 16th hats, open hats,
                      deep synth bass and a pad (C - Am - F - Dm - G), sidechained to the kick
  Bar 10    (18-20 s) clean resolve on 0:18: kick, C chord and bass, cymbal, ringing out to 0:20

Every hit is placed on an exact sample index (beat = 24000 samples), so the
grid is sample-accurate against the 24 fps video (beat = 12 frames).

Run: python3 scripts/make-story-music.py "public/audio/Alert Global Tech - Story Cards Music.wav"
Needs numpy and scipy.
"""

import sys

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 120
BEAT = 60 / BPM  # 0.5 s
BAR = 4 * BEAT  # 2 s
BARS = 10
N = int(BARS * BAR * SR)
rng = np.random.default_rng(120)

L = np.zeros(N)
R = np.zeros(N)


def at(t):
    return int(round(t * SR))


def add(sig, t, gain=1.0, pan=0.0):
    """Mix a mono signal in at time t (seconds), equal-power pan -1..1."""
    i = at(t)
    sig = sig[: max(0, N - i)]
    a = (pan + 1) * np.pi / 4
    L[i : i + len(sig)] += sig * gain * np.cos(a)
    R[i : i + len(sig)] += sig * gain * np.sin(a)


def filt(x, kind, freq, order=2):
    sos = butter(order, freq, btype=kind, fs=SR, output="sos")
    return sosfilt(sos, x)


def env(n, attack, decay):
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    a = max(1, int(attack * SR))
    e[:a] *= np.linspace(0, 1, a)
    return e


def kick():
    n = int(0.45 * SR)
    t = np.arange(n) / SR
    f = 48 + 110 * np.exp(-t / 0.035)  # pitch sweep down to a deep 48 Hz
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t / 0.28)
    click = filt(rng.standard_normal(n), "highpass", 3000) * np.exp(-t / 0.004) * 0.25
    return np.tanh(1.6 * (body + click))


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = filt(rng.standard_normal(n), "bandpass", [900, 2600])
    e = np.zeros(n)
    for k, d in enumerate([0.0, 0.011, 0.022]):  # three quick bursts, then the tail
        i = int(d * SR)
        e[i:] += np.exp(-(t[: n - i]) / (0.006 if k < 2 else 0.13))
    return noise * e * 0.9


def hat(decay):
    n = int((decay * 6) * SR)
    return filt(rng.standard_normal(n), "highpass", 7500) * env(n, 0.0005, decay)


def cymbal(decay):
    n = int(min(decay * 5, 2.2) * SR)
    return filt(rng.standard_normal(n), "highpass", 4500) * env(n, 0.002, decay) * 0.5


def saw(freq, n, detune=0.0):
    t = np.arange(n) / SR
    f = freq * (1 + detune)
    return 2 * ((t * f) % 1.0) - 1


def bass_note(freq, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    sub = np.sin(2 * np.pi * freq * t)
    body = filt(saw(freq, n), "lowpass", 380)
    e = env(n, 0.004, length * 0.6)
    e[-int(0.01 * SR) :] *= np.linspace(1, 0, int(0.01 * SR))
    return np.tanh(1.4 * (0.75 * sub + 0.5 * body)) * e


def pad(freqs, length, decay):
    n = int(length * SR)
    out = np.zeros(n)
    for f in freqs:
        for d in (-0.004, 0.0, 0.004):
            out += saw(f, n, d)
    out = filt(out / (3 * len(freqs)), "lowpass", 2200)
    return out * env(n, 0.02, decay)


def note(name):
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    letter, octave = name[0], int(name[1:])
    return 440.0 * 2 ** ((names[letter] + 12 * (octave - 4)) / 12)


# Chords for the drop (bars 5-9) and the resolve (bar 10)
CHORDS = [
    ("C2", ["C4", "E4", "G4"]),
    ("A1", ["A3", "C4", "E4"]),
    ("F1", ["F3", "A3", "C4"]),
    ("D2", ["A3", "D4", "F4"]),
    ("G1", ["G3", "B3", "D4"]),
]
RESOLVE = ("C2", ["C3", "G3", "C4", "E4", "G4"])

K, CL = kick(), clap()
HC, HO = hat(0.035), hat(0.12)

# Sidechain envelope: bass and pad duck under every kick
duck = np.ones(N)

for bar in range(BARS):
    t0 = bar * BAR
    drop = 4 <= bar <= 8
    if bar <= 8:
        for b in range(4):
            tb = t0 + b * BEAT
            add(K, tb, 0.95 if drop else 0.7)  # sparse intro sits lower so the drop lands
            i = at(tb)
            m = min(N - i, int(BEAT * SR))
            duck[i : i + m] = np.minimum(duck[i : i + m], 1 - 0.7 * np.exp(-np.arange(m) / SR / 0.11))
            # Hats: offbeat 8ths always; 16ths and open hats in the drop
            add(HC, tb + BEAT / 2, 0.30, pan=0.25)
            if drop:
                add(HC, tb + BEAT / 4, 0.14, pan=-0.2)
                add(HC, tb + 3 * BEAT / 4, 0.14, pan=-0.2)
                add(HO, tb + BEAT / 2, 0.16, pan=0.3)
                if b in (1, 3):
                    add(CL, tb, 0.75)
    if drop:
        root, chord = CHORDS[bar - 4]
        f = note(root)
        bass = np.zeros(N)
        # Deep bass: root on the downbeat, then driving offbeat 8ths
        seg = bass_note(f, 0.22)
        for b in range(4):
            for off in ((0.0, BEAT / 2) if b == 0 else (BEAT / 2,)):
                i = at(t0 + b * BEAT + off)
                bass[i : i + len(seg)] += seg[: N - i]
        p = pad([note(x) for x in chord], BAR, 1.6)
        padsig = np.zeros(N)
        i = at(t0)
        padsig[i : i + len(p)] += p[: N - i]
        L[:] += (bass * 0.8 + padsig * 0.24) * duck
        R[:] += (bass * 0.8 + padsig * 0.25) * duck

# Cymbal on the drop
add(cymbal(0.7), 8.0, 0.35, pan=-0.1)

# Resolve on 0:18: kick, long bass and chord, cymbal, ringing out to 0:20
t_res = 9 * BAR
add(K, t_res, 0.95)
root, chord = RESOLVE
add(bass_note(note(root), 1.95), t_res, 0.6)
add(pad([note(x) for x in chord], 2.0, 0.75), t_res, 0.22, pan=-0.05)
add(pad([note(x) for x in chord], 2.0, 0.75), t_res, 0.22, pan=0.05)
add(cymbal(0.55), t_res, 0.4)

# Master: gentle glue, soft clip, then set the level for a bed under a voiceover
# (about -16 LUFS integrated, true peak well under -1 dBTP). 10 ms fade at the very end.
PEAK_DB = -7.0
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.15)
mix /= np.max(np.abs(mix)) / 10 ** (PEAK_DB / 20)
fade = int(0.01 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

out = sys.argv[1] if len(sys.argv) > 1 else "story-music.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"Wrote {out}: {N / SR:.3f} s, {SR} Hz stereo, {BPM} BPM")
