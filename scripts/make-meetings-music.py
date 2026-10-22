"""Original instrumental for the "Meetings, sorted." video. No samples, no vocals.

Playful, confident electronic beat for a voiceover to sit on later: exactly 120 BPM, 4/4,
10 bars of 2 s (20 s), 48 kHz stereo. Clean kick on every beat throughout.

  Bars 1-4   (0-8 s)    sparse: kick, off-beat hats, ticking-clock tick-tock; a short riser into the drop
  Bars 5-9   (8-18 s)   the drop on 0:08: clap on 2 and 4, bouncy synth bass, off-beat chord stabs, 16th hats
  Bar 10     (18-20 s)  clean resolve on 0:18 to F: one kick, bass, chord and bell ring out to 0:20

Every hit sits on an exact sample index (beat = 24000 samples = 12 video frames at 24 fps).

Run: python3 scripts/make-meetings-music.py "public/audio/Alert Global Tech - Meetings Sorted Music.wav"
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
BARS = 10
N = int(BARS * BAR * SR)
rng = np.random.default_rng(2008)

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


def kick():
    n = int(0.32 * SR)
    t = np.arange(n) / SR
    f = 50 + 110 * np.exp(-t / 0.035)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.16)
    click = filt(rng.standard_normal(n), "bandpass", [2000, 5000]) * np.exp(-t / 0.003) * 0.25
    return np.tanh(1.4 * (body + click))


def clap():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    noise = filt(rng.standard_normal(n), "bandpass", [900, 2600])
    env = np.zeros(n)
    for k, off in enumerate((0.0, 0.011, 0.022)):  # three quick hands, then the tail
        i = int(off * SR)
        env[i:] += np.exp(-(t[: n - i]) / (0.007 if k < 2 else 0.07))
    return noise * env * 0.7


def hat(length=0.05):
    n = int(length * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "highpass", 7500) * np.exp(-t / (length / 4))


def tick(freq):
    # A wooden clock tick: a short pitched click.
    n = int(0.04 * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * freq * t) + 0.4 * np.sin(2 * np.pi * freq * 2.3 * t)
    return tone * np.exp(-t / 0.008)


def bass(f, length):
    # Bouncy synth bass: saw-ish tone through a plucky low-pass envelope.
    n = int(length * SR)
    t = np.arange(n) / SR
    saw = sum(np.sin(2 * np.pi * f * k * t) / k for k in range(1, 8))
    bright = filt(saw, "lowpass", 900) * np.exp(-t / 0.06)
    dark = filt(saw, "lowpass", 220)
    return np.tanh(1.3 * (0.6 * dark + 0.6 * bright)) * adsr(n, 0.004, 0.08, 0.7, 0.03)


def stab(freqs, length=0.2):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for d in (-0.004, 0.004):
            out += np.sign(np.sin(2 * np.pi * f * (1 + d) * t)) * 0.5 + np.sin(2 * np.pi * f * (1 + d) * t)
    out = filt(out / (2 * len(freqs)), "lowpass", 2600)
    return out * adsr(n, 0.003, 0.05, 0.5, 0.06)


def pad(freqs, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for d in (-0.003, 0.003):
            ph = 2 * np.pi * f * (1 + d) * t
            out += np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
    out = filt(out / (2 * len(freqs)), "lowpass", 1800)
    return out * adsr(n, 0.01, 0.4, 0.6, 1.2)


def bell(f, length=2.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.9 / m)) for m, a in ((1, 1), (2.76, 0.35), (5.4, 0.12)))
    return tone * np.minimum(1, t / 0.002)


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    x = filt(rng.standard_normal(n), "highpass", 2500)
    return x * (t / length) ** 2


CHORDS = {
    "F": ("F1", ["F3", "A3", "C4"]),
    "Dm": ("D2", ["F3", "A3", "D4"]),
    "Bb": ("Bb1", ["F3", "Bb3", "D4"]),
    "Gm": ("G1", ["G3", "Bb3", "D4"]),
    "C": ("C2", ["E3", "G3", "C4"]),
}
DROP = ["F", "Dm", "Bb", "Gm", "C"]  # bars 5-9, resolving to F on bar 10
# Bass bounce per bar, in 8ths: (octave multiplier, length in 8ths); None is a rest.
BOUNCE = [(1, 1), (2, 1), None, (1, 1), (1, 1), (2, 1), (1, 0.5), (2, 1)]

duck = np.ones(N)  # sidechain so stabs and bass bounce with the kick
K, CL = kick(), clap()

for bar in range(9):  # bars 1-9: kick on every beat
    t0 = bar * BAR
    for b in range(4):
        add(K, t0 + b * BEAT, 0.5 if bar < 4 else 0.8)  # lighter before the drop
        i = at(t0 + b * BEAT)
        m = min(N - i, int(BEAT * SR))
        duck[i : i + m] = np.minimum(duck[i : i + m], 1 - 0.45 * np.exp(-np.arange(m) / SR / 0.09))

for bar in range(4):  # bars 1-4: sparse, ticking clock
    t0 = bar * BAR
    for e in range(8):
        add(tick(3100 if e % 2 == 0 else 2300), t0 + e * BEAT / 2, 0.16, pan=0.35 if e % 2 else -0.35)
        if e % 2:
            add(hat(), t0 + e * BEAT / 2, 0.10, pan=0.2)
add(riser(BAR), 3 * BAR, 0.10)

for k, name in enumerate(DROP):  # bars 5-9: the drop
    t0 = (4 + k) * BAR
    root, chord = CHORDS[name]
    for b in (1, 3):
        add(CL, t0 + b * BEAT, 0.55, pan=0.05)
    for s in range(16):
        add(hat(0.035 if s % 2 else 0.05), t0 + s * BEAT / 4, 0.05 if s % 2 else 0.08, pan=0.25)
    for e, hit in enumerate(BOUNCE):
        if hit is None:
            continue
        mult, length = hit
        add(bass(note(root) * mult, length * BEAT / 2 - 0.01), t0 + e * BEAT / 2, 0.38, duck=duck)
    for b in range(4):  # chord stab on every off-beat
        add(stab([note(x) * 2 for x in chord]), t0 + b * BEAT + BEAT / 2, 0.16, pan=-0.2 if b % 2 else 0.2, duck=duck)
add(K, 4 * BAR, 0.25)  # a touch more weight on the drop downbeat

# The resolve on 0:18, ringing out to 0:20
t_res = 9 * BAR
root, chord = CHORDS["F"]
add(K, t_res, 0.9)
add(CL, t_res, 0.35)
add(bass(note(root), 1.9), t_res, 0.40)
for pan in (-0.15, 0.15):
    add(pad([note(x) for x in chord] + [note("F4")], 2.0), t_res, 0.26, pan=pan)
add(bell(note("F5"), 2.0), t_res, 0.14, pan=-0.1)
add(bell(note("C6"), 2.0), t_res, 0.07, pan=0.1)

# Master: soft limit, peak -1 dBFS, a short fade so the ring-out lands on silence at 0:20
mix = np.stack([L, R], axis=1)
mix = np.tanh(mix * 1.1)
mix /= np.max(np.abs(mix)) / 10 ** (-1 / 20)
fade = int(0.6 * SR)
mix[-fade:] *= (np.linspace(1, 0, fade) ** 1.5)[:, None]

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"Wrote {out}: {N / SR:.3f} s, {SR} Hz stereo, {BPM} BPM")
