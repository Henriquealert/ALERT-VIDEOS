"""Places the voiceover for "Data, sorted." (DataSorted-9x16) and mixes it over the music.

Input:  the ElevenLabs take (voice: Killian - Clear, Warm, Upbeat & Friendly, model eleven_v4)
        and the instrumental from make-data-sorted-music.py.
Output: a voiceover stem and the final mix the video plays.

The take is split at its pauses into 18 lines. Each line's first syllable lands at the time
its scene beat appears on screen (same times as src/videos/DataSorted.tsx). The music sits
about 11 LU under the voice and ducks a further 6 dB while it speaks. Mix about -16 LUFS,
peak -1.5 dBFS.

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/mix-data-sorted-voiceover.py
"""

import subprocess

import numpy as np
from scipy.io import wavfile

SR = 48000
DIR = "public/audio/"
TAKE = DIR + "Alert Global Tech - Data Sorted Voiceover Take.mp3"
MUSIC = DIR + "Alert Global Tech - Data Sorted Music.wav"
VO_OUT = DIR + "Alert Global Tech - Data Sorted Voiceover.wav"
MIX_OUT = DIR + "Alert Global Tech - Data Sorted Mix.wav"

# (cut start, cut end) in the take, and where the line's first syllable lands (s).
PHRASES = [
    ((0.00, 3.15), 0.30),  # Your AI is only as good as the data you feed it.     scene 1
    ((3.15, 6.57), 4.70),  # Before you roll out Copilot, ask three quick questions.  scene 2
    ((6.57, 8.36), 8.00),  # Is your data in one place?
    ((8.36, 9.38), 9.75),  # Is it current?
    ((9.38, 10.63), 10.75),  # Does someone own it?
    ((10.63, 12.08), 13.20),  # Here's the sneaky part:                           scene 3
    ((12.08, 18.48), 14.50),  # one wrong record ... the answer your team gets from AI.
    ((18.48, 20.27), 21.70),  # And it adds up fast.                              scene 4
    ((20.27, 26.85), 23.40),  # Forrester found more than a quarter of organizations ...
    ((26.85, 32.21), 29.90),  # IBM reports nearly half of business leaders ...
    ((32.21, 33.24), 35.20),  # The good news?
    ((33.24, 34.31), 36.05),  # It's fixable.
    ((34.31, 35.51), 37.50),  # Start early.                                      scene 5
    ((35.51, 37.13), 38.60),  # Check data where it's entered.
    ((37.13, 43.23), 40.30),  # Remove duplicates. Give every dataset an owner. Then let AI ...
    ((43.23, 49.23), 47.60),  # Alert Global Tech helps you get Microsoft 365, SharePoint ...  scene 6
    ((49.23, 52.22), 53.60),  # Hardware, software and AI, sorted.
    ((52.22, 53.24), 56.50),  # Book a Sprint.
]


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def lufs(x):
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-f", "f64le", "-ar", str(SR), "-ac", str(x.shape[1]), "-i", "-",
         "-af", "ebur128", "-f", "null", "-"],
        input=x.astype(np.float64).tobytes(),
        capture_output=True,
    ).stderr.decode()
    return float(p.split("I:")[-1].split("LUFS")[0])


take = decode(TAKE)
sr_m, music = wavfile.read(MUSIC)
music = music.astype(np.float64) / 32768
N = len(music)

vo = np.zeros(N)
thresh = 10 ** (-30 / 20) * np.max(np.abs(take))  # speech onset, not breaths
for (a, b), target in PHRASES:
    seg = take[int(a * SR) : int(b * SR)].copy()
    onset = int(np.argmax(np.abs(seg) > thresh))
    fade = int(0.008 * SR)
    seg[:fade] *= np.linspace(0, 1, fade)
    seg[-fade:] *= np.linspace(1, 0, fade)
    i = int(round(target * SR)) - onset
    end = min(N, i + len(seg))
    vo[i:end] += seg[: end - i]
    print(f"{target:5.2f}s  phrase {a:5.2f}-{b:5.2f}s of the take, onset +{onset / SR * 1000:.0f} ms")

# Sidechain: smooth envelope of the voice, music ducks up to 6 dB under it.
env = np.abs(vo)
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
sm = np.zeros(N)
level = 0.0
for k in range(N):
    c = att if env[k] > level else rel
    level = c * level + (1 - c) * env[k]
    sm[k] = level
amount = np.clip(sm / (0.2 * np.max(sm)), 0, 1)
duck = 10 ** (-6 * amount / 20)

vo_st = np.stack([vo, vo], axis=1)
music_d = music * duck[:, None]

# Voice at -16 LUFS; the music bed about 11 LU under it before ducking. Mix to -16 LUFS.
vo_st *= 10 ** ((-16 - lufs(vo_st)) / 20)
mix = vo_st + music_d * 10 ** ((-27 - lufs(music)) / 20)
mix *= 10 ** ((-16 - lufs(mix)) / 20)
peak = np.max(np.abs(mix))
if peak > 10 ** (-1.5 / 20):
    mix /= peak / 10 ** (-1.5 / 20)

wavfile.write(VO_OUT, SR, (np.clip(vo_st / max(1e-9, np.max(np.abs(vo_st))) * 0.89, -1, 1) * 32767).astype(np.int16))
wavfile.write(MIX_OUT, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
print(f"Wrote {VO_OUT} and {MIX_OUT}: mix {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
