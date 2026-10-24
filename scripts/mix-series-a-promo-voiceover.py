"""Places the voiceover for the "Series A, sorted." promo (SeriesAPromo-16x9 / -4x5) and mixes it over the music.

Input:  the ElevenLabs take (voice: Everett - Confident American Ads, model eleven_v4)
        and the instrumental from make-series-a-promo-audio.py.
Output: a voiceover stem and the final mix the video plays.

The script reads only the on-screen copy. The take is cut at its pauses into lines; each line's first
syllable lands at the time below (scene starts in src/videos/SeriesAPromo.tsx: 0, 4, 9, 14, 19, 25 s).
Each product name lands on the beat where it appears on screen (S5_ITEMS). The music sits about 9 LU under the voice and
ducks a further 6 dB while it speaks. Mix about -16 LUFS, peak -1.5 dBFS.

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/mix-series-a-promo-voiceover.py
"""

import subprocess

import numpy as np
from scipy.io import wavfile

SR = 48000
DIR = "public/audio/"
TAKE = DIR + "Alert Global Tech - Series A Sorted Promo Voiceover Take.mp3"
MUSIC = DIR + "Alert Global Tech - Series A Sorted Promo Music.wav"
VO_OUT = DIR + "Alert Global Tech - Series A Sorted Promo Voiceover.wav"
MIX_OUT = DIR + "Alert Global Tech - Series A Sorted Promo Mix.wav"
MUSIC_UNDER = 9  # LU the bed sits under the voice before ducking

# (cut start, cut end) in the take, and where the line's first syllable lands (s).
PHRASES = [
    ((0.00, 1.92), 0.15),  # SOC 2 is coming.                                   scene 1
    ((1.92, 6.64), 4.20),  # Your first enterprise customer wants proof ...    scene 2
    ((6.64, 10.11), 9.30),  # Every device. Encrypted. Managed. Compliant.     scene 3
    ((10.11, 11.59), 14.05),  # Day one: ready.                                scene 4
    ((11.59, 13.17), 16.05),  # Last day: wiped.
    ((13.17, 14.92), 19.20),  # Series A, sorted.                              scene 5
    ((14.92, 15.58), 20.50),  # Dell
    ((15.58, 16.42), 21.00),  # HP
    ((16.42, 18.12), 21.55),  # Microsoft 365
    ((18.12, 18.96), 23.00),  # Copilot
    ((18.96, 19.63), 23.60),  # Intune
    ((19.63, 20.56), 24.05),  # Defender
    ((20.56, 22.29), 25.15),  # One monthly price per employee.                scene 6, end card
    ((22.29, 24.50), 26.80),  # One supplier, from quote to setup.
    ((24.50, 25.28), 28.80),  # Book a call.
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

# Voice at -16 LUFS; the music bed MUSIC_UNDER LU under it before ducking. Mix to -16 LUFS.
vo_st *= 10 ** ((-16 - lufs(vo_st)) / 20)
mix = vo_st + music_d * 10 ** ((-16 - MUSIC_UNDER - lufs(music)) / 20)
mix *= 10 ** ((-16 - lufs(mix)) / 20)
peak = np.max(np.abs(mix))
if peak > 10 ** (-1.5 / 20):
    mix /= peak / 10 ** (-1.5 / 20)

wavfile.write(VO_OUT, SR, (np.clip(vo_st / max(1e-9, np.max(np.abs(vo_st))) * 0.89, -1, 1) * 32767).astype(np.int16))
wavfile.write(MIX_OUT, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
print(f"Wrote {VO_OUT} and {MIX_OUT}: mix {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
