"""Places the voiceover on the beat grid and mixes it over the music.

Video: "Tech updates for you" - Windows 11 Pro for Business (TechUpdates-Windows11-9x16).
Input:  the ElevenLabs take (voice: Everett - Confident American Ads, model eleven_v4)
        and the instrumental from make-story-music.py.
Output: a voiceover stem (on the grid) and the final mix the video plays.

The take is split at its pauses; ten of its eleven lines are used (the eBook line is not). Each line's first syllable lands on a
0.25 s step, at the moment its words appear on screen (same times as the video code).
The music sits well under the voice: it starts about 11 LU below it and ducks a further
6 dB while the voice speaks. The final mix is set to about -16 LUFS, peak -1.5 dBFS.

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/mix-story-voiceover.py
"""

import subprocess

import numpy as np
from scipy.io import wavfile

SR = 48000
DIR = "public/audio/"
TAKE = DIR + "Alert Global Tech - Tech Updates Windows 11 Voiceover Take.mp3"
MUSIC = DIR + "Alert Global Tech - Tech Updates Windows 11 Music.wav"
VO_OUT = DIR + "Alert Global Tech - Tech Updates Windows 11 Voiceover.wav"
MIX_OUT = DIR + "Alert Global Tech - Tech Updates Windows 11 Mix.wav"

# (cut start, cut end) in the take, and where the phrase's first syllable lands (s).
PHRASES = [
    ((0.00, 1.57), 0.25),  # Tech updates for you.                      card 1
    ((1.57, 4.11), 2.00),  # Windows 11 Pro for business.
    ((4.11, 8.19), 4.50),  # You're expected to balance AI, security...  card 2
    ((8.19, 9.88), 8.50),  # It can be hard to keep up.
    ((9.88, 13.60), 10.00),  # Windows 11 Pro helps you meet new IT mandates.  card 3, on the downbeat
    ((13.60, 15.78), 13.50),  # Advanced, built-in security.
    ((15.78, 18.10), 15.50),  # Simplified hybrid device management.
    ((18.10, 20.63), 17.75),  # Faster, AI-driven workflows.
    ((20.63, 23.32), 20.25),  # Innovation and protection, balanced.      card 4
    ((23.32, 26.86), 22.75),  # Stay secure, productive, and prepared for the future.
    # Card 5 (end card) has no voice line: the music resolves under the logo and CTA.
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
