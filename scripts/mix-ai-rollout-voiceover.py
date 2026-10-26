"""Places the voiceover for the AI rollout video (AiRollout-4x5) and mixes it over the music.

Input:  the ElevenLabs take (voice: Jerry B. - Premium Luxury Commercial, model eleven_v4)
        and the instrumental from make-ai-rollout-music.py.
Output: a voiceover stem and the final mix the video plays.

The take is cut at its pauses into 7 lines, one per scene. Each line's first syllable lands at the
time below (scene starts are bars 0, 4, 8, 13, 18, 23, 26 at 132 BPM; lines 2 and 4 wait for the flash
bar to pass, the long ones ride it; the scene 6 line plays 6% faster to clear the end card). The music sits about 8 LU under the voice and ducks a further
5 dB while it speaks. Mix -14 LUFS, peak -1.5 dBFS.

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/mix-ai-rollout-voiceover.py
"""

import subprocess

import numpy as np
from scipy.io import wavfile

SR = 48000
DIR = "public/audio/"
TAKE = DIR + "Alert Global Tech - AI Rollout Voiceover Take.mp3"
MUSIC = DIR + "Alert Global Tech - AI Rollout Music.wav"
VO_OUT = DIR + "Alert Global Tech - AI Rollout Voiceover.wav"
MIX_OUT = DIR + "Alert Global Tech - AI Rollout Mix.wav"
MUSIC_UNDER = 8  # LU the bed sits under the voice before ducking
TARGET = -14
BAR = 4 * 60 / 132

# Where each line's first syllable lands (s) and its tempo, in take order.
LINES = [
    (0.0 * BAR + 0.45, 1.0),  # Quick question. Who actually set up your AI?                 scene 1, over the flash
    (5.0 * BAR, 1.0),  # New tools. Same old habits. And no real plan.                         scene 2, bar 2
    (8.0 * BAR + 0.1, 1.0),  # Here's how it should go. Check licences ... team by team.      scene 3 (9 s line)
    (14.0 * BAR, 1.0),  # Show people it working. Ask Copilot in Word ... and there it is.     scene 4, bar 2
    (18.0 * BAR + 0.45, 1.0),  # It all stays inside your tenant. ... can already open.        scene 5
    (41.5, 1.06),  # Then we train your team. In English, Spanish or Portuguese ...           scene 6, nudged 6% faster
    (26.0 * BAR + 0.15, 1.0),  # AI, made practical. Talk to an Expert.                        end card
]
MIN_GAP = 0.6  # a pause this long (s) separates two lines in the take


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


def stretch(x, tempo):
    if tempo == 1.0:
        return x
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-f", "f64le", "-ar", str(SR), "-ac", "1", "-i", "-", "-af", f"atempo={tempo}",
         "-f", "f64le", "-"],
        input=x.tobytes(),
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float64).copy()


def phrases(take):
    """Speech regions of the take, split wherever it is quiet for MIN_GAP or longer."""
    hop = int(0.01 * SR)
    rms = np.sqrt(np.convolve(take**2, np.ones(hop) / hop, mode="same"))[::hop]
    loud = rms > 10 ** (-38 / 20) * np.max(rms)
    idx = np.flatnonzero(loud)
    regions, start, last = [], idx[0], idx[0]
    for k in idx[1:]:
        if (k - last) * 0.01 >= MIN_GAP:
            regions.append((start, last))
            start = k
        last = k
    regions.append((start, last))
    return [(max(0, a * 0.01 - 0.03), b * 0.01 + 0.25) for a, b in regions]


take = decode(TAKE)
sr_m, music = wavfile.read(MUSIC)
music = music.astype(np.float64) / 32768
N = len(music)

found = phrases(take)
if len(found) != len(LINES):
    raise SystemExit(f"Found {len(found)} phrases in the take, expected {len(LINES)}: {found}")

vo = np.zeros(N)
starts = [t for t, _ in LINES] + [N / SR]
for k, ((a, b), (target, tempo)) in enumerate(zip(found, LINES)):
    seg = stretch(take[int(a * SR) : int(b * SR)].copy(), tempo)
    fade = int(0.01 * SR)
    seg[:fade] *= np.linspace(0, 1, fade)
    seg[-fade:] *= np.linspace(1, 0, fade)
    i = int(round((target - 0.03) * SR))
    end = min(N, i + len(seg))
    vo[i:end] += seg[: end - i]
    dur = len(seg) / SR
    flag = "  OVERLAPS NEXT LINE" if target + dur - 0.25 > starts[k + 1] else ""
    print(f"{target:6.2f}s - {target + dur:6.2f}s  take {a:5.2f}-{b:5.2f}s x{tempo}{flag}")

# Sidechain: smooth envelope of the voice, music ducks up to 5 dB under it.
env = np.abs(vo)
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.35 * SR))
sm = np.zeros(N)
level = 0.0
for k in range(N):
    c = att if env[k] > level else rel
    level = c * level + (1 - c) * env[k]
    sm[k] = level
amount = np.clip(sm / (0.2 * np.max(sm)), 0, 1)
duck = 10 ** (-5 * amount / 20)

vo_st = np.stack([vo, vo], axis=1)
music_d = music * duck[:, None]

vo_st *= 10 ** ((TARGET - lufs(vo_st)) / 20)
mix = vo_st + music_d * 10 ** ((TARGET - MUSIC_UNDER - lufs(music)) / 20)
for _ in range(3):
    mix *= 10 ** ((TARGET - lufs(mix)) / 20)
    peak = np.max(np.abs(mix))
    ceiling = 10 ** (-1.5 / 20)
    if peak > ceiling:  # soft-knee limit only the peaks above the ceiling
        over = np.abs(mix) > 0.8 * ceiling
        mix[over] = np.sign(mix[over]) * (0.8 * ceiling + 0.2 * ceiling * np.tanh((np.abs(mix[over]) - 0.8 * ceiling) / (0.2 * ceiling)))
edge = int(0.004 * SR)
mix[-edge:] *= np.linspace(1, 0, edge)[:, None]

wavfile.write(VO_OUT, SR, (np.clip(vo_st / max(1e-9, np.max(np.abs(vo_st))) * 0.89, -1, 1) * 32767).astype(np.int16))
wavfile.write(MIX_OUT, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
print(f"Wrote {VO_OUT} and {MIX_OUT}: mix {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
