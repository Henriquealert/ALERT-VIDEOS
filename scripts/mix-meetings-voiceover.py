"""Places the voiceover on the beat grid and mixes it over the music.

Video: "Meetings, sorted." (MeetingsSorted-9x16).
Input:  the ElevenLabs take (voice: Everett - Confident American Ads, model eleven_v4)
        and the instrumental from make-meetings-music.py.
Output: a voiceover stem (on the grid) and the final mix the video plays.

The take is split at its pauses. Each line's first syllable lands on a 0.25 s step, at the
moment its words appear on screen (same times as the video code). The card-4 caption is
sped up slightly so it finishes as the end card lands.
The music sits well under the voice: about 12 LU below it, ducking a further 6 dB while
the voice speaks. The final mix is set to about -16 LUFS, peak -1.5 dBFS.

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/mix-meetings-voiceover.py
"""

import subprocess

import numpy as np
from scipy.io import wavfile

SR = 48000
DIR = "public/audio/"
TAKE = DIR + "Alert Global Tech - Meetings Sorted Voiceover Take.mp3"
MUSIC = DIR + "Alert Global Tech - Meetings Sorted Music.wav"
VO_OUT = DIR + "Alert Global Tech - Meetings Sorted Voiceover.wav"
MIX_OUT = DIR + "Alert Global Tech - Meetings Sorted Mix.wav"
MUSIC_UNDER = 12  # LU between the voice and the music bed, before ducking

# (cut start, cut end) in the take, where the first syllable lands (s), and playback speed.
PHRASES = [
    ((0.00, 2.08), 0.50, 1.0),  # The meeting just moved to tomorrow.      card 1
    ((2.08, 3.72), 4.25, 1.0),  # You still need the charts.               card 2
    ((3.72, 5.25), 8.25, 1.0),  # Ask Copilot Chat.                        card 3, the drop
    ((5.25, 7.29), 9.75, 1.0),  # Your data, presentation-ready.
    ((7.29, 8.68), 14.25, 1.0),  # Meetings, sorted.                       card 4
    ((8.68, 10.82), 15.50, 1.08),  # Microsoft 365 and Copilot,
    ((10.82, 12.01), 17.50, 1.08),  # set up by Alert.
    ((12.01, 13.12), 18.50, 1.0),  # Request a quote.                      card 5, under the pill
]


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def stretch(x, speed):
    if speed == 1.0:
        return x
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "f64le", "-ar", str(SR), "-ac", "1", "-i", "-",
         "-af", f"atempo={speed}", "-f", "f64le", "-"],
        input=x.tobytes(),
        check=True,
        capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float64).copy()


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
for (a, b), target, speed in PHRASES:
    seg = stretch(take[int(a * SR) : int(b * SR)].copy(), speed)
    onset = int(np.argmax(np.abs(seg) > thresh))
    fade = int(0.008 * SR)
    seg[:fade] *= np.linspace(0, 1, fade)
    seg[-fade:] *= np.linspace(1, 0, fade)
    i = int(round(target * SR)) - onset
    end = min(N, i + len(seg))
    vo[i:end] += seg[: end - i]
    last = i + int(np.nonzero(np.abs(seg) > thresh)[0][-1])
    print(f"{target:5.2f}s  phrase {a:5.2f}-{b:5.2f}s of the take, speech ends {last / SR:5.2f}s")

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
