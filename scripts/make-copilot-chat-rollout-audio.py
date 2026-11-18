"""Original bed for "Copilot Chat rollout, sorted." No samples, no vocals, no voiceover.

Minimal electronic bed at 120 BPM, 4/4, 10 bars of 2 s (20 s), 48 kHz stereo, normalised to -18 LUFS:

  0:00-2:50    soft pad (Am9) and a muted pulse: the question being typed
  2:50-16:50   pad changes every bar pair (Am9, Fmaj9, Cmaj9, G6), soft kick on the beat,
               closed tick on the off-beats, quiet plucked arpeggio from 4:50
  16:50-20:00  end card: drums drop, one Fmaj9 -> Cmaj9 resolve on 18:00 (the hold), rings out

On top: one soft UI click on each card. CLICKS below are the card frames in
src/videos/CopilotChatRollout.tsx (send click at 70, reply card at 88, then CUTS); keep them in step.

Run: python3 scripts/make-copilot-chat-rollout-audio.py "public/audio/Alert Global Tech - Copilot Chat Rollout Music.wav"
Needs numpy, scipy and pyloudnorm.
"""

import sys

import numpy as np
import pyloudnorm as pyln
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
FPS = 30
BEAT = 0.5
DUR = 20.0
N = int(DUR * SR)
TARGET_LUFS = -18.0
rng = np.random.default_rng(1118)

CLICKS = [70, 88, 135, 225, 315, 405, 495]  # frames
DRUMS = (75 / FPS, 495 / FPS)  # drums from the reply card to the end card
RESOLVE = 540 / FPS

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


hz = lambda m: 440.0 * 2 ** ((m - 69) / 12)


def pad(notes, length, attack=0.4, release=0.8):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for m in notes:
        for d in (-0.003, 0.0, 0.003):
            ph = 2 * np.pi * hz(m) * (1 + d) * t
            out += np.sin(ph) + 0.12 * np.sin(2 * ph)
    out = filt(out / (3 * len(notes)), "lowpass", 1600)
    env = np.minimum(1, t / attack) * np.minimum(1, (length - t) / release)
    return out * np.clip(env, 0, 1)


def kick():
    n = int(0.25 * SR)
    t = np.arange(n) / SR
    f = 48 + 70 * np.exp(-t / 0.025)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.11)


def tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "highpass", 7500) * np.exp(-t / 0.007)


def pluck(m):
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * hz(m) * t
    return filt(np.sin(ph) + 0.3 * np.sin(2 * ph), "lowpass", 3000) * np.exp(-t / 0.09) * np.minimum(1, t / 0.003)


def sub(m, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    return np.sin(2 * np.pi * hz(m) * t) * np.minimum(1, t / 0.01) * np.exp(-t / 0.18)


def click():
    # Soft UI click: a short filtered tap with a little pitched body, ~25 ms.
    n = int(0.025 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 1800 * t) * np.exp(-t / 0.004)
    noise = filt(rng.standard_normal(n), "bandpass", [2500, 6000]) * np.exp(-t / 0.003)
    return (0.6 * body + 0.4 * noise) * np.minimum(1, t / 0.0004)


# Chords: (pad notes, bass note), two bars (4 s) each.
CHORDS = [
    ([57, 60, 64, 67, 71], 45),  # Am9
    ([53, 57, 60, 64, 67], 41),  # Fmaj9
    ([48, 55, 59, 62, 64], 36),  # Cmaj9
    ([55, 59, 62, 64], 43),  # G6
]
for k in range(4):
    notes, bass = CHORDS[k]
    start = k * 4.0
    length = 4.0 if k < 3 else 1.0 * 16.5 - start  # last pad runs to the end card
    add(pad(notes, length + 0.6), start, 0.55)
    # Muted bass pulse on beats 1 and the "and" of 2
    for b in range(int(length / BEAT)):
        t = start + b * BEAT
        if t >= 16.5:
            break
        if b % 4 in (0, 1):
            add(sub(bass, 0.4), t + (0.25 if b % 4 == 1 else 0), 0.35)
    # Arpeggio from 4.5 s, 8th notes
    for e in range(int(length / (BEAT / 2))):
        t = start + e * BEAT / 2
        if 4.5 <= t < 16.5:
            add(pluck(notes[e % len(notes)] + 12), t, 0.08, pan=0.35 if e % 2 else -0.35)

K = kick()
t = DRUMS[0]
while t < DRUMS[1] - 1e-6:
    add(K, t, 0.45)
    add(tick(), t + BEAT / 2, 0.06, pan=0.25)
    t += BEAT

# End card: Fmaj9 on the cut, resolving to Cmaj9 on the hold.
add(pad([53, 57, 60, 64, 67], RESOLVE - 16.5 + 0.4, attack=0.2, release=0.4), 16.5, 0.5)
add(pad([48, 55, 59, 62, 64, 71], DUR - RESOLVE, attack=0.15, release=1.4), RESOLVE, 0.6)
add(sub(36, 1.2), RESOLVE, 0.35)

for fr in CLICKS:
    add(click(), fr / FPS, 0.35, pan=0.1)

mix = np.tanh(np.stack([L, R], axis=1) * 1.2)
fade = int(0.5 * SR)
mix[-fade:] *= np.linspace(1, 0, fade)[:, None]

meter = pyln.Meter(SR)
loud = meter.integrated_loudness(mix)
mix *= 10 ** ((TARGET_LUFS - loud) / 20)
peak = np.max(np.abs(mix))
if peak > 10 ** (-1 / 20):
    raise SystemExit(f"Peak {20 * np.log10(peak):.1f} dBFS after loudness gain; lower the click or kick gain")

out = sys.argv[1] if len(sys.argv) > 1 else "music.wav"
wavfile.write(out, SR, (mix * 32767).astype(np.int16))
print(f"Wrote {out}: {DUR:.1f} s, {SR} Hz stereo, 120 BPM, {meter.integrated_loudness(mix):.1f} LUFS, peak {20 * np.log10(peak):.1f} dBFS")
