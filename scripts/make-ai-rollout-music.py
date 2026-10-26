"""Original instrumental for the "AI rollout" LinkedIn video. No samples, no vocals.

Restrained deep 2-step: exactly 132 BPM, 4/4, 29 bars (52.73 s), 48 kHz stereo, mastered to -14 LUFS.
Minor key and unhurried: soft electric-piano chords and a filtered string pad on Cm9 - Abmaj9 - Ebmaj7 - Fm9,
a calm sub bass (two notes a bar), light swing on quiet hats, a soft clap on 2 and 4, kick on 16ths 0 and 10.
A shared room reverb keeps it from sounding dry.

  Bars 1-4    scene 1: pad, keys, kick, clap and hats (no bass, no shaker)
  Bars 5-26   scenes 2-6: full groove, the bass comes in on bar 5
  Bar 26      last two beats break (pad only) into the end card
  Bars 27-29  end card: full groove, last chord on the last beat, then the track stops dead

The first bar of every scene keeps the kick on 16ths 0 and 10 and the clap on 4 and 12, so the video's
"flash" jumps on them (FLASH_STEPS in src/videos/AiRollout.tsx). Scene starts (bars) match SCENE_BARS there.

Run: python3 scripts/make-ai-rollout-music.py "public/audio/Alert Global Tech - AI Rollout Music.wav"
Needs numpy, scipy and ffmpeg (loudness measurement).
"""

import json
import subprocess
import sys

import numpy as np
from scipy.io import wavfile
from scipy.ndimage import minimum_filter1d
from scipy.signal import butter, fftconvolve, sosfilt

SR = 48000
BPM = 132
BEAT = 60 / BPM
S16 = BEAT / 4
BARS = 29
N = int(round(BARS * 4 * BEAT * SR))
SWING = 0.1  # odd 16ths land 10% of a 16th late: a lean, not a skip
SCENE_BARS = [0, 4, 8, 13, 18, 23, 26]
TARGET_LUFS = -14.0
rng = np.random.default_rng(1324)

# Dry bus and reverb send, both stereo.
DRY = np.zeros((N, 2))
SEND = np.zeros((N, 2))


def step_time(bar, step):
    return bar * 4 * BEAT + step * S16 + (SWING * S16 if step % 2 else 0.0)


def add(sig, t, gain=1.0, pan=0.0, verb=0.0):
    i = int(round(t * SR))
    if i >= N:
        return
    sig = sig[: N - i] * gain
    a = (pan + 1) * np.pi / 4
    st = np.stack([sig * np.cos(a), sig * np.sin(a)], axis=1)
    DRY[i : i + len(sig)] += st
    if verb:
        SEND[i : i + len(sig)] += st * verb


def filt(x, kind, freq, order=2):
    return sosfilt(butter(order, freq, btype=kind, fs=SR, output="sos"), x)


def hz(name):
    names = {"C": -9, "Db": -8, "D": -7, "Eb": -6, "E": -5, "F": -4, "Gb": -3, "G": -2, "Ab": -1, "A": 0, "Bb": 1, "B": 2}
    letter, octave = name[:-1], int(name[-1])
    return 440.0 * 2 ** ((names[letter] + 12 * (octave - 4)) / 12)


# ---------- Voices ----------


def kick():
    n = int(0.36 * SR)
    t = np.arange(n) / SR
    f = 46 + 70 * np.exp(-t / 0.04)
    body = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.2)
    click = filt(rng.standard_normal(n), "bandpass", [1200, 3000]) * np.exp(-t / 0.002) * 0.12
    return np.tanh(1.2 * (body + click))


def clap():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for k, d in enumerate([0.0, 0.009, 0.019]):  # three soft hand hits, then the tail
        i = int(d * SR)
        x[i:] += np.exp(-(t[: n - i]) / (0.012 if k < 2 else 0.11)) * (0.6 if k < 2 else 1.0)
    noise = filt(rng.standard_normal(n), "bandpass", [900, 5000])
    return noise * x * 0.55


def hat():
    n = int(0.04 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "highpass", 8000, order=4) * np.exp(-t / 0.009)


def shaker():
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.02) * np.exp(-t / 0.03)
    return filt(rng.standard_normal(n), "bandpass", [4000, 10000]) * e


def sub(freq, dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    ph = 2 * np.pi * freq * t
    x = np.sin(ph) + 0.08 * np.sin(2 * ph)
    e = np.minimum(1, t / 0.01) * np.minimum(1, (dur - t) / 0.05)
    return np.tanh(1.2 * x) * e


def epiano(notes, dur):
    """Soft electric piano: a sine with a gentle FM tine, slow decay, rounded top."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for name in notes:
        f = hz(name)
        mod = np.sin(2 * np.pi * f * 14 * t) * 0.9 * np.exp(-t / 0.05)  # tine attack
        x += np.sin(2 * np.pi * f * t + mod) * np.exp(-t / 1.1)
        x += 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.4)
    x *= np.minimum(1, t / 0.003) * np.minimum(1, (dur - t) / 0.08)
    return filt(x / len(notes), "lowpass", 2600)


def strings(notes, dur):
    """String-section pad: detuned saws per note with slow vibrato, filtered dark, slow attack."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.zeros(n)
    for name in notes:
        for det, rate in ((-0.09, 4.8), (0.0, 5.3), (0.08, 5.9)):
            f = hz(name) * 2 ** (det / 12) * (1 + 0.003 * np.sin(2 * np.pi * rate * t + rng.uniform(0, 6.28)))
            ph = np.cumsum(f) / SR + rng.uniform()
            x += 2 * (ph % 1.0) - 1
    x = filt(filt(x / (3 * len(notes)), "lowpass", 1500), "highpass", 180)
    att, rel = int(0.5 * SR), int(0.4 * SR)
    e = np.ones(n)
    e[:att] = np.linspace(0, 1, att) ** 1.5
    e[-rel:] *= np.linspace(1, 0, rel)
    return x * e


def swell(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = filt(rng.standard_normal(n), "bandpass", [600, 6000])
    return x * (t / dur) ** 3 * 0.25


def room_ir(seconds=1.8):
    n = int(seconds * SR)
    t = np.arange(n) / SR
    ir = np.stack([rng.standard_normal(n), rng.standard_normal(n)], axis=1)
    ir *= np.exp(-t / (seconds / 6.9))[:, None]
    ir = np.stack([filt(ir[:, c], "lowpass", 5000) for c in (0, 1)], axis=1)
    ir[: int(0.012 * SR)] = 0  # pre-delay
    return ir / np.sqrt(np.sum(ir**2))


# ---------- Arrangement ----------

# (bass root, bass on the "and" of 3, e-piano voicing, string voicing)
CHORDS = [
    ("C2", "G1", ["Eb4", "G4", "Bb4", "D5"], ["C4", "G4", "Eb5"]),  # Cm9
    ("Ab1", "Eb2", ["C4", "Eb4", "G4", "Bb4"], ["Ab3", "Eb4", "C5"]),  # Abmaj9
    ("Eb2", "Bb1", ["D4", "G4", "Bb4", "Eb5"], ["Eb4", "Bb4", "G5"]),  # Ebmaj7
    ("F1", "C2", ["Ab3", "C4", "Eb4", "G4"], ["F3", "C4", "Ab4"]),  # Fm9
]
KEY_STEPS = [(0, 1.0), (7, 0.55), (10, 0.7)]  # e-piano: downbeat, a pushed 8th, the kick on 10
HAT_VEL = [0.0, 0.25, 0.6, 0.25, 0.0, 0.25, 0.6, 0.3, 0.0, 0.25, 0.6, 0.25, 0.0, 0.25, 0.6, 0.35]

KICK, CLAP = kick(), clap()
LAST = BARS - 1

for bar in range(BARS):
    bass, bass2, keys, pad = CHORDS[bar % 4]
    brk = bar == 25  # last two beats of bar 26 drop to the pad into the end card
    end_bar = bar == LAST
    intro = bar < 4

    # Kick on 16ths 0 and 10 (the 2-step), soft.
    for s in (0, 10):
        if (brk and s >= 8) or (end_bar and s > 12):
            continue
        add(KICK, step_time(bar, s), 0.85 if s == 0 else 0.7)
    # Clap on 2 and 4 (from bar 1 so the first flash has its hits), into the room.
    for s in (4, 12):
        if brk and s >= 8:
            continue
        add(CLAP, step_time(bar, s), 0.5, pan=0.03, verb=0.45)
    # Quiet hats on the off-16ths, shaker on the 8ths after the intro.
    for s in range(16):
        if (end_bar and s > 12) or (brk and s >= 8) or HAT_VEL[s] == 0:
            continue
        add(hat(), step_time(bar, s), 0.14 * HAT_VEL[s], pan=0.3)
    if not intro and not end_bar:
        for s in range(2, 16, 4):
            add(shaker(), step_time(bar, s), 0.07, pan=-0.35, verb=0.2)

    # Strings: one long chord per bar, overlapping into the next.
    if not end_bar:
        add(strings(pad, 4 * BEAT + 0.4), step_time(bar, 0), 0.16, verb=0.6)
    # Electric piano.
    for s, v in KEY_STEPS:
        if (brk and s >= 8) or (end_bar and s > 12):
            continue
        add(epiano(keys, 3 * S16 if s else 5 * S16), step_time(bar, s), 0.26 * v, pan=-0.1, verb=0.35)

    # Sub bass from bar 5: root on the one, fifth on the 16th before the kick on 10.
    if bar >= 4 and not end_bar:
        if brk:
            add(sub(hz(bass), 7 * S16), step_time(bar, 0), 0.7)
        else:
            add(sub(hz(bass), 6.5 * S16), step_time(bar, 0), 0.7)
            add(sub(hz(bass2), 5 * S16), step_time(bar, 9), 0.55)

    # Soft swell into each scene change.
    if bar + 1 in SCENE_BARS:
        add(swell(2 * BEAT), step_time(bar, 8), 0.5 if bar == 25 else 0.3, verb=0.5)

# End card downbeat lands a little fuller; last beat: kick, chord and root, then silence.
add(KICK, step_time(26, 0), 0.3)
add(strings(CHORDS[0][3], 4 * BEAT), step_time(26, 0), 0.08, verb=0.6)
end_t = step_time(LAST, 12)
add(epiano(CHORDS[0][2], 4 * S16), end_t, 0.32, verb=0.4)
add(sub(hz("C2"), 4 * S16), end_t, 0.8)

# ---------- Master: room reverb, loudness and peak limiter ----------

ir = room_ir()
wet = np.stack([fftconvolve(SEND[:, c], ir[:, c])[:N] for c in (0, 1)], axis=1)
mix = DRY + 0.35 * wet
mix = np.stack([filt(mix[:, c], "highpass", 30) for c in (0, 1)], axis=1)
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
