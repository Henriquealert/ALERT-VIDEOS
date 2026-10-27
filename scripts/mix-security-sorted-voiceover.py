"""Places the voiceover for "Security, sorted." (SecuritySorted-4x5 / -16x9) and mixes it over the music.

Input:  the ElevenLabs take (voice: Everett - Confident American Ads, model eleven_v4)
        and the instrumental from make-security-sorted-audio.py.
Output: a voiceover stem and the final mix the video plays.

The take is split at its pauses into 7 lines. Each line's first syllable lands at the start
of its shot (shot times in src/videos/SecuritySorted.tsx); nothing is said over the 17.5 s
low hit and the monogram. The music sits about 9 LU under the voice and ducks a further
6 dB while it speaks. Mix about -16 LUFS, peak -1.5 dBFS.

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/mix-security-sorted-voiceover.py
"""

import subprocess

import numpy as np
from scipy.io import wavfile

SR = 48000
DIR = "public/audio/"
TAKE = DIR + "Alert Global Tech - Security Sorted Voiceover Take.mp3"
MUSIC = DIR + "Alert Global Tech - Security Sorted Music.wav"
VO_OUT = DIR + "Alert Global Tech - Security Sorted Voiceover.wav"
MIX_OUT = DIR + "Alert Global Tech - Security Sorted Mix.wav"
MUSIC_UNDER = 9  # LU the bed sits under the voice before ducking

# (cut start, cut end) in the take, and where the line's first syllable lands (s).
PHRASES = [
    ((0.00, 1.70), 0.30),  # Security slows us down?                                  shot 1
    ((1.70, 5.12), 3.70),  # Strong security and a fast team don't have to compete.   shot 2
    ((5.12, 8.64), 7.10),  # Windows 11 Pro builds security into every laptop.        shot 3
    ((8.64, 12.18), 10.40),  # T-P-M, BitLocker and Secure Boot, built in.            shot 4
    ((12.18, 15.88), 13.75),  # Protection from chip to cloud, so your team keeps moving.  shot 5
    ((15.88, 17.74), 19.15),  # Security, sorted.                                     shot 7, end card
    ((17.74, 19.04), 20.75),  # Request a Quote.
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
