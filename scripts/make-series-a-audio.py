"""Audio, captions and timeline for "Series A, sorted." (SeriesASorted-4x5). No samples, no vocals in the music.

Input:  the ElevenLabs take (voice: Jim F - Warm, Confident, Conversational, model eleven_v4,
        23 Oct 2026). Word times below come from its ElevenLabs Scribe transcript.
Output: src/videos/series-a-timeline.json  scene starts, line times and caption cues (the video reads it)
        public/audio/... Music.wav              original calm bed, 80 BPM, 86 s
        public/audio/... Voiceover.wav          the take cut into 17 lines, placed on the scenes
        public/audio/... Mix.wav                what the video plays (about -16 LUFS, -1.5 dBFS peak)
        docs/social/Alert Global Tech - Series A Sorted Explainer 4x5.srt

Each line's first word lands at its `target` time; its headline rises in just before. Captions
follow the take's own word times, so they stay in sync with the voice.

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/make-series-a-audio.py
"""

import json
import subprocess

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, sosfilt

SR = 48000
FPS = 30
LENGTH = 86.0
DIR = "public/audio/"
TAKE = DIR + "Alert Global Tech - Series A Sorted Voiceover Take.mp3"
MUSIC_OUT = DIR + "Alert Global Tech - Series A Sorted Music.wav"
VO_OUT = DIR + "Alert Global Tech - Series A Sorted Voiceover.wav"
MIX_OUT = DIR + "Alert Global Tech - Series A Sorted Mix.wav"
TIMELINE_OUT = "src/videos/series-a-timeline.json"
SRT_OUT = "docs/social/Alert Global Tech - Series A Sorted Explainer 4x5.srt"

# Scene starts (s), from the brief: opening, trigger, pain, title, inside, fund, close, end.
SCENES = [0, 6, 18, 28, 36, 62, 76, LENGTH]

# id: (first word start, last word end) in the take, target (s) in the video, caption cues
# as (text, start of its first word in the take). Long sentences split into two cues so a
# caption never runs past two lines.
LINES = {
    "open": ((0.00, 4.00), 1.6, [("Here's what happens to IT when a startup raises its Series A.", 0.00)]),
    "soc2": ((4.48, 7.44), 6.7, [("The first big customer asks for SOC 2.", 4.48)]),
    "managed": ((7.92, 13.76), 10.6, [("Suddenly every laptop, every account and every leaver", 7.92),
                                      ("has to be managed, and provable.", 11.60)]),
    "dayone": ((14.24, 16.80), 18.6, [("New hires need a laptop ready on day one.", 14.24)]),
    "lastday": ((17.20, 20.72), 21.5, [("People who leave need theirs returned, wiped and logged.", 17.20)]),
    "falls": ((20.96, 23.68), 25.4, [("Usually that falls on a founder or an ops lead.", 20.96)]),
    "bundle": ((24.16, 26.96), 29.6, [("So we built the Series A Compliance bundle.", 24.16)]),
    "c1": ((27.36, 30.92), 36.7, [("Business laptops from Dell and HP, financed monthly.", 27.36)]),
    "c2": ((31.12, 35.04), 43.1, [("Every device managed and secured with Microsoft Intune and Defender.", 31.12)]),
    "c3": ((35.44, 39.20), 49.5, [("Microsoft 365 and Copilot, set up from day one.", 35.44)]),
    "c4": ((39.36, 45.04), 55.9, [("And device evidence for the SOC 2 audit,", 39.36),
                                 ("with onboarding and offboarding handled for you.", 42.24)]),
    "price": ((45.12, 47.04), 62.6, [("One monthly price per employee,", 45.12)]),
    "runway": ((47.12, 49.28), 65.4, [("so founders keep cash for the runway.", 47.12)]),
    "supplier": ((49.36, 51.68), 68.6, [("One supplier, from quote to setup,", 49.36)]),
    "languages": ((51.80, 56.08), 71.5, [("in English, Spanish or Portuguese, sourced through TD SYNNEX.", 51.80)]),
    "talk": ((56.16, 60.00), 77.6, [("If your portfolio companies are heading into Series A, let's talk.", 56.16)]),
    "cta": ((60.08, 60.80), 82.2, [("Book a Call.", 60.08)]),
}


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


N = int(LENGTH * SR)

# ---------- Voice placement and caption cues ----------

take = decode(TAKE)
vo = np.zeros(N)
cues = []
lines = {}
for key, ((a, b), target, parts) in LINES.items():
    lines[key] = round(target * FPS)
    pre = min(a, 0.05)
    seg = take[int((a - pre) * SR) : int((b + 0.12) * SR)].copy()
    fade = int(0.008 * SR)
    seg[:fade] *= np.linspace(0, 1, fade)
    seg[-fade:] *= np.linspace(1, 0, fade)
    i = int(round((target - pre) * SR))
    vo[i : i + len(seg)] += seg[: N - i]
    for text, t in parts:
        cues.append([target + t - a, text])
    print(f"{target:5.2f}-{target + b - a:5.2f}s  {key}")

# Each cue holds until 0.1 s before the next, at most 0.7 s after its line ends.
ends = {}
for key, ((a, b), target, parts) in LINES.items():
    ends[parts[-1][0]] = target + b - a
timed = []
for k, (start, text) in enumerate(cues):
    nxt = cues[k + 1][0] if k + 1 < len(cues) else LENGTH
    end = min(nxt - 0.1, ends.get(text, nxt) + 0.7)
    timed.append((start, end, text))

# ---------- Music: calm, premium bed, 80 BPM ----------

BPM = 80
BEAT = 60 / BPM
BAR = 4 * BEAT
L = np.zeros(N)
R = np.zeros(N)
rng = np.random.default_rng(2026)


def at(t):
    return int(round(t * SR))


def add(sig, t, gain=1.0, pan=0.0):
    i = at(t)
    if i >= N:
        return
    sig = sig[: N - i] * gain
    a = (pan + 1) * np.pi / 4
    L[i : i + len(sig)] += sig * np.cos(a)
    R[i : i + len(sig)] += sig * np.sin(a)


def filt(x, kind, freq, order=2):
    return sosfilt(butter(order, freq, btype=kind, fs=SR, output="sos"), x)


def note(name):
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "B": 2}
    return 440.0 * 2 ** ((names[name[:-1]] + 12 * (int(name[-1]) - 4)) / 12)


def env(n, a, r):
    e = np.ones(n)
    ia, ir = int(a * SR), int(r * SR)
    e[:ia] = np.linspace(0, 1, ia)
    e[-ir:] *= np.linspace(1, 0, ir)
    return e


def pad(names, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in (note(x) for x in names):
        for d in (-0.004, 0.0, 0.004):
            out += np.sin(2 * np.pi * f * (1 + d) * t) + 0.18 * np.sin(4 * np.pi * f * (1 + d) * t)
    return filt(out / (3 * len(names)), "lowpass", 1200) * env(n, 1.2, 1.2)


def pluck(f, length=0.9):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return filt(tone * np.minimum(1, t / 0.004) * np.exp(-t / 0.28), "lowpass", 2400)


def bell(f, length=4.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (1.4 / m)) for m, a in ((1, 1), (2.76, 0.25), (5.4, 0.08)))
    return tone * np.minimum(1, t / 0.003)


def felt():
    n = int(0.4 * SR)
    t = np.arange(n) / SR
    f = 50 + 30 * np.exp(-t / 0.05)
    return filt(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.18) * np.minimum(1, t / 0.004), "lowpass", 160)


def brush():
    n = int(0.15 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "bandpass", [4000, 9000]) * np.minimum(1, t / 0.02) * np.exp(-t / 0.05)


# One chord per bar (3 s): Fmaj7, Am7, Cmaj7, G6 - open, unresolved until the close.
CHORDS = {
    "F": (["F3", "A3", "C4", "E4"], ["A4", "C5", "E5", "C5"]),
    "Am": (["E3", "A3", "C4", "G4"], ["A4", "C5", "E5", "G5"]),
    "C": (["E3", "G3", "C4", "B4"], ["G4", "C5", "E5", "B4"]),
    "G": (["D3", "G3", "B3", "E4"], ["G4", "B4", "D5", "E5"]),
}
LOOP = ["F", "Am", "C", "G"]
BARS = int(np.ceil(LENGTH / BAR))
FELT, BRUSH = felt(), brush()
for bar in range(BARS):
    t0 = bar * BAR
    close = t0 >= 81.0
    name = "C" if close else LOOP[bar % 4]
    chord, arp = CHORDS[name]
    add(pad(chord, BAR + 1.4), t0, 0.30, pan=-0.1)
    if close:
        continue
    # Sparse pluck on beats from the trigger scene on; 8ths from the bundle to the fund scene
    if t0 >= 6:
        busy = 36 <= t0 < 76
        steps = range(8) if busy else range(0, 8, 2)
        for e in steps:
            add(pluck(note(arp[e % 4])), t0 + e * BEAT / 2, 0.10 if e % 2 else 0.13, pan=0.3 if e % 2 else -0.3)
    # Soft felt pulse under the bundle and the fund scene only
    if 36 <= t0 < 76:
        for b in (0, 2):
            add(FELT, t0 + b * BEAT, 0.35)
        for b in (1, 3):
            add(BRUSH, t0 + b * BEAT, 0.04, pan=0.25)

add(bell(note("E5")), 1.4, 0.10, pan=0.15)  # lockup
add(bell(note("C6")), 28.0, 0.09, pan=-0.15)  # title card
add(bell(note("G5")), 36.0, 0.07, pan=0.15)  # what's inside
add(bell(note("E5")), 76.0, 0.09, pan=-0.15)  # close
add(bell(note("C5"), 5.0), 82.2, 0.11, pan=0.1)  # Book a Call

music = np.stack([L, R], axis=1)
music = np.tanh(music * 1.05)
music /= np.max(np.abs(music)) / 10 ** (-9 / 20)
fade = int(2.5 * SR)
music[-fade:] *= (np.linspace(1, 0, fade) ** 1.5)[:, None]
music[: int(0.4 * SR)] *= np.linspace(0, 1, int(0.4 * SR))[:, None]
wavfile.write(MUSIC_OUT, SR, (music * 32767).astype(np.int16))

# ---------- Mix ----------

# Sidechain: smooth envelope of the voice, music ducks up to 6 dB under it.
e = np.abs(vo)
att, rel = np.exp(-1 / (0.03 * SR)), np.exp(-1 / (0.4 * SR))
sm = np.zeros(N)
level = 0.0
for k in range(N):
    c = att if e[k] > level else rel
    level = c * level + (1 - c) * e[k]
    sm[k] = level
duck = 10 ** (-6 * np.clip(sm / (0.2 * np.max(sm)), 0, 1) / 20)

vo_st = np.stack([vo, vo], axis=1)
vo_st *= 10 ** ((-16 - lufs(vo_st)) / 20)
mix = vo_st + music * duck[:, None] * 10 ** ((-28 - lufs(music)) / 20)
mix *= 10 ** ((-16 - lufs(mix)) / 20)
# Soft limiter: only the loudest syllables reach the knee; ceiling -1.5 dBFS.
ceil = 10 ** (-1.5 / 20)
mix = np.tanh(mix / ceil) * ceil
wavfile.write(VO_OUT, SR, (np.clip(vo_st / np.max(np.abs(vo_st)) * 0.89, -1, 1) * 32767).astype(np.int16))
wavfile.write(MIX_OUT, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
print(f"Wrote {MUSIC_OUT}, {VO_OUT}, {MIX_OUT}: mix {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")

# ---------- Timeline (frames) and SRT ----------

timeline = {
    "fps": FPS,
    "durationInFrames": round(LENGTH * FPS),
    "scenes": [round(s * FPS) for s in SCENES],
    "lines": lines,
    "captions": [[round(a * FPS), round(b * FPS), text] for a, b, text in timed],
}
with open(TIMELINE_OUT, "w") as f:
    json.dump(timeline, f, indent=1)
    f.write("\n")


def stamp(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


with open(SRT_OUT, "w") as f:
    for k, (a, b, text) in enumerate(timed, 1):
        f.write(f"{k}\n{stamp(a)} --> {stamp(b)}\n{text}\n\n")
print(f"Wrote {TIMELINE_OUT} and {SRT_OUT}: {len(timed)} cues")
