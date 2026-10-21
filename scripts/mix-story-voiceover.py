"""Places the Story Cards voiceover on the beat grid and mixes it over the music.

Input:  the ElevenLabs take (voice: Everett - Confident American Ads, model eleven_v4)
        and the instrumental from make-story-music.py.
Output: a voiceover stem (on the grid) and the final mix the video plays.

The take is split at its pauses into seven phrases. Each phrase's first syllable is
placed on a 0.25 s step, timed to when its words appear on screen. The music ducks
under the voice (sidechain, about -9 dB) and the mix is set to -14 LUFS, -1 dBTP.

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/mix-story-voiceover.py
"""

import subprocess

import numpy as np
from scipy.io import wavfile

SR = 48000
DIR = "public/audio/"
TAKE = DIR + "Alert Global Tech - Story Cards Voiceover Take.mp3"
MUSIC = DIR + "Alert Global Tech - Story Cards Music.wav"
VO_OUT = DIR + "Alert Global Tech - Story Cards Voiceover.wav"
MIX_OUT = DIR + "Alert Global Tech - Story Cards Mix.wav"

# (cut start, cut end) in the take, and where the phrase's first syllable lands (s).
PHRASES = [
    ((0.00, 1.75), 0.25),  # Still running Windows 10?            card 1, with the headline
    ((1.75, 5.47), 4.25),  # Free security updates ended in ...   card 2
    ((5.47, 9.59), 8.25),  # Windows 11 Pro laptops from Dell ... card 3, on the drop
    ((9.59, 11.10), 12.25),  # Licensed and set up.
    ((11.10, 12.59), 14.25),  # Laptops, sorted.                  card 4
    ((12.59, 14.97), 15.75),  # One supplier, from quote to setup. (one step after "sorted." ends)
    ((14.97, 16.04), 18.50),  # Request a quote.                  card 5, with the button
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
thresh = 10 ** (-40 / 20) * np.max(np.abs(take))
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

# Sidechain: smooth envelope of the voice, music ducks up to 9 dB under it.
env = np.abs(vo)
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
sm = np.zeros(N)
level = 0.0
for k in range(N):
    c = att if env[k] > level else rel
    level = c * level + (1 - c) * env[k]
    sm[k] = level
amount = np.clip(sm / (0.2 * np.max(sm)), 0, 1)
duck = 10 ** (-9 * amount / 20)

vo_st = np.stack([vo, vo], axis=1)
music_d = music * duck[:, None]

# Voice sits about 10 LU above the ducked music, then the whole mix goes to -14 LUFS.
vo_st *= 10 ** ((-16 - lufs(vo_st)) / 20)
mix = vo_st + music_d * 10 ** ((-26 - lufs(music_d)) / 20) * 10 ** (8 / 20)
mix *= 10 ** ((-14 - lufs(mix)) / 20)
peak = np.max(np.abs(mix))
if peak > 10 ** (-1.5 / 20):
    mix /= peak / 10 ** (-1.5 / 20)

wavfile.write(VO_OUT, SR, (np.clip(vo_st / max(1e-9, np.max(np.abs(vo_st))) * 0.89, -1, 1) * 32767).astype(np.int16))
wavfile.write(MIX_OUT, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
print(f"Wrote {VO_OUT} and {MIX_OUT}: mix {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
