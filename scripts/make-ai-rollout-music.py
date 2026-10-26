"""Original instrumental for the "AI rollout" LinkedIn video. No samples, no vocals.

Light UK garage, 2-step: exactly 132 BPM, 4/4, 29 bars (52.73 s), 48 kHz stereo, mastered to -14 LUFS.
Swung 16th hats, skippy kick (16ths 0 and 10, plus 7 on the in-between bars), crisp snare on 2 and 4,
rolling sub bass, airy pad and swung organ stabs on Ebmaj9 - Dm7 - Gm9 - Fadd9.

  Bars 1-4    scene 1: drums, pad, stabs (no bass)
  Bars 5-26   scenes 2-6: full groove, the bass rolls in on bar 5
  Bar 26      last two beats break (no kick, no bass) into the end card
  Bars 27-29  end card: full groove, last hit on the last beat, then the track stops dead

The first bar of every scene uses the plain kick pattern, so the video's "flash" can jump on the kicks
and snares at 16ths 0, 4, 10 and 12 (FLASH_STEPS in src/videos/AiRollout.tsx). Scene starts (bars)
match SCENE_BARS there.

Run: python3 scripts/make-ai-rollout-music.py "public/audio/Alert Global Tech - AI Rollout Music.wav"
Needs numpy, scipy and ffmpeg (loudness measurement).
"""

import json
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, sosfilt

SR = 48000
BPM = 132
BEAT = 60 / BPM
S16 = BEAT / 4
BARS = 29
N = int(round(BARS * 4 * BEAT * SR))
SWING = 0.2  # odd 16ths land 20% of a 16th late
SCENE_BARS = [0, 4, 8, 13, 18, 23, 26]
TARGET_LUFS = -14.0
rng = np.random.default_rng(132)

L = np.zeros(N)
R = np.zeros(N)


def step_time(bar, step):
    return bar * 4 * BEAT + step * S16 + (SWING * S16 if step % 2 else 0.0)


def add(sig, t, gain=1.0, pan=0.0):
    i = int(round(t * SR))
    if i >= N:
        return
    sig = sig[: N - i] * gain
    a = (pan + 1) * np.pi / 4
    L[i : i + len(sig)] += sig * np.cos(a)
    R[i : i + len(sig)] += sig * np.sin(a)


def filt(x, kind, freq, order=2):
    return sosfilt(butter(order, freq, btype=kind, fs=SR, output="sos"), x)


def env(n, attack, decay):
    t = np.arange(n) / SR
    e = np.exp(-t / decay)
    ia = int(attack * SR)
    if ia:
        e[:ia] *= np.linspace(0, 1, ia)
    return e


def hz(name):
    names = {"C": -9, "Db": -8, "D": -7, "Eb": -6, "E": -5, "F": -4, "Gb": -3, "G": -2, "Ab": -1, "A": 0, "Bb": 1, "B": 2}
    letter, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[letter] + 12 * (octave - 4)) / 12)


# ---------- Voices ----------


def kick():
    n = int(0.28 * SR)
    t = np.arange(n) / SR
    f = 52 + 120 * np.exp(-t / 0.03)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.13)
    click = filt(rng.standard_normal(n), "bandpass", [2500, 6000]) * np.exp(-t / 0.002) * 0.3
    return np.tanh(1.5 * (body + click))


def snare():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = filt(rng.standard_normal(n), "bandpass", [1800, 9000]) * np.exp(-t / 0.07)
    tone = np.sin(2 * np.pi * 195 * t) * np.exp(-t / 0.035) * 0.6
    crack = filt(rng.standard_normal(n), "highpass", 5000) * np.exp(-t / 0.008) * 0.6
    return np.tanh(1.3 * (noise + tone + crack)) * 0.8


def rim():
    n = int(0.08 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "bandpass", [1500, 3500]) * np.exp(-t / 0.012) * 0.5


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    t = np.arange(n) / SR
    x = filt(rng.standard_normal(n), "highpass", 7500, order=4)
    return x * np.exp(-t / (0.07 if open_ else 0.012))


def sub(freq, dur, glide_to=None):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.full(n, freq) if glide_to is None else freq * (glide_to / freq) ** np.clip((t - dur * 0.6) / (dur * 0.4), 0, 1)
    ph = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(ph) + 0.18 * np.sin(2 * ph)
    e = np.minimum(1, t / 0.006) * np.minimum(1, (dur - t) / 0.03)
    return np.tanh(1.6 * x) * e * 0.9


def organ(notes, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for name in notes:
        f = hz(name)
        for mult, amp in [(1, 1.0), (2, 0.55), (3, 0.3), (4, 0.18), (6, 0.08)]:
            x += amp * np.sin(2 * np.pi * f * mult * t + rng.uniform(0, 6.28))
    x = x / len(notes) * env(n, 0.004, 0.11) * np.minimum(1, (dur - t) / 0.02)
    return filt(x, "lowpass", 4200)


def pad(notes, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for name in notes:
        for det in (-0.12, 0.0, 0.12):
            f = hz(name) * 2 ** (det / 12)
            ph = (f * t + rng.uniform()) % 1.0
            x += 2 * ph - 1
    x = filt(x / (3 * len(notes)), "lowpass", 2400)
    fade = int(0.25 * SR)
    e = np.ones(n)
    e[:fade] = np.linspace(0, 1, fade)
    e[-fade:] = np.linspace(1, 0, fade)
    return x * e


def riser(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = filt(rng.standard_normal(n), "highpass", 3000)
    return x * (t / dur) ** 2.5 * 0.35


# ---------- Arrangement ----------

CHORDS = [
    ("Eb2", ["Eb4", "G4", "Bb4", "D5", "F5"]),
    ("D2", ["D4", "F4", "A4", "C5", "E5"]),
    ("G1", ["Bb3", "D4", "F4", "A4", "D5"]),
    ("F2", ["F4", "A4", "C5", "G5"]),
]
STAB_STEPS = [3, 6, 11]
HAT_VEL = [0.55, 0.35, 0.8, 0.4, 0.5, 0.35, 0.8, 0.45, 0.55, 0.35, 0.8, 0.4, 0.5, 0.35, 0.8, 0.5]

KICK, SNARE, RIM = kick(), snare(), rim()
LAST = BARS - 1

for bar in range(BARS):
    root, chord = CHORDS[bar % 4]
    first = bar in SCENE_BARS
    brk = bar == 25  # last two beats of bar 26 break into the end card
    end_bar = bar == LAST

    # Kick: 0 and 10; 7 as well on bars that don't start a scene.
    for s in [0, 10] if first else [0, 7, 10]:
        if brk and s >= 8:
            continue
        if end_bar and s > 12:
            continue
        add(KICK, step_time(bar, s), 0.95 if s == 0 else 0.8)
    # Snare on 2 and 4, rim ghost on the swung 15th now and then.
    for s in (4, 12):
        add(SNARE, step_time(bar, s), 0.62, pan=0.05)
    if not first and not brk and bar % 2:
        add(RIM, step_time(bar, 15), 0.35, pan=-0.3)
    # Hats: swung 16ths, open hat on the "and" of each beat.
    for s in range(16):
        if end_bar and s > 12:
            continue
        add(hat(), step_time(bar, s), 0.22 * HAT_VEL[s], pan=0.25)
        if s % 4 == 2:
            add(hat(True), step_time(bar, s), 0.13, pan=-0.2)

    # Pad under everything (airy, quiet).
    if not end_bar:
        add(pad(chord[:4], 4 * BEAT + 0.25), step_time(bar, 0), 0.11, pan=0)
    # Organ stabs.
    for s in STAB_STEPS:
        if end_bar and s > 12:
            continue
        add(organ(chord, 1.5 * S16), step_time(bar, s), 0.34, pan=-0.15 if s == 6 else 0.15)

    # Sub bass from bar 5, rolling: long root, two pushes, glide up into the next bar.
    if bar >= 4 and not end_bar:
        f = hz(root)
        nxt = hz(CHORDS[(bar + 1) % 4][0])
        if brk:
            add(sub(f, 6 * S16), step_time(bar, 0), 0.75)
        else:
            add(sub(f, 5.5 * S16), step_time(bar, 0), 0.75)
            add(sub(f, 2.6 * S16), step_time(bar, 6), 0.6)
            add(sub(f * 2, 1.6 * S16), step_time(bar, 9), 0.4)
            add(sub(f, 4 * S16, glide_to=nxt), step_time(bar, 12), 0.6)

    # Short riser into each scene change.
    if bar + 1 in SCENE_BARS:
        add(riser(4 * BEAT), step_time(bar, 0), 0.6 if bar == 25 else 0.35)

# End card downbeat: a bigger hit. Last beat: kick, snare, full stab and bass, then silence.
add(KICK, step_time(26, 0), 0.4)
end_t = step_time(LAST, 12)
add(organ(CHORDS[0][1], 3 * S16), end_t, 0.5)
add(sub(hz("Eb2"), 4 * S16), end_t, 0.85)

# ---------- Master: loudness and peak limiter ----------

mix = np.stack([L, R], axis=1)
mix = np.stack([filt(mix[:, c], "highpass", 28) for c in (0, 1)], axis=1)
edge = int(0.004 * SR)
mix[-edge:] *= np.linspace(1, 0, edge)[:, None]  # click-free stop, not a fade


def lufs(x):
    tmp = "/dev/shm/ai-rollout-measure.wav"
    wavfile.write(tmp, SR, x.astype(np.float32))
    out = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-i", tmp, "-af", "loudnorm=print_format=json", "-f", "null", "-"],
        capture_output=True,
        text=True,
    ).stderr
    m = json.loads(out[out.rfind("{") : out.rfind("}") + 1])
    return float(m["input_i"]), float(m["input_tp"])


def limit(x, ceiling):
    peak = np.max(np.abs(x), axis=1)
    g = np.minimum(1.0, ceiling / np.maximum(peak, 1e-9))
    w = int(0.003 * SR)
    g = minimum_filter1d(g, size=2 * w + 1)
    k = np.hanning(2 * w + 1)
    g = np.convolve(g, k / k.sum(), mode="same")
    return x * g[:, None]


ceiling = 10 ** (-1.5 / 20)
for _ in range(4):
    i, tp = lufs(mix)
    mix = limit(mix * 10 ** ((TARGET_LUFS - i) / 20), ceiling)
i, tp = lufs(mix)
print(f"{N / SR:.3f} s, {i:.1f} LUFS, {tp:.1f} dBTP")

out = sys.argv[1] if len(sys.argv) > 1 else "public/audio/Alert Global Tech - AI Rollout Music.wav"
wavfile.write(out, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
print("wrote", out)
