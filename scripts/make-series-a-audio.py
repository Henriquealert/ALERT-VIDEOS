"""Timeline, music, sound design, voiceover mix and captions for "Series A, sorted." (SeriesASorted-16x9 / -9x16).

Everything is original and synthesised (no samples) except the voiceover: one ElevenLabs take
(voice: Isaac - Energetic, Warm, Confident, model eleven_v4), split at its pauses into 16 phrases,
each placed so its first syllable lands where the picture needs it.

Grid: 125 BPM, 1 beat = 0.48 s = 14.4 frames at 30 fps. Every cut sits on a beat (frame = round(beat * 14.4)).
Scenes start on beats 0, 8, 19, 29, 35, 42, 63, 72 (0.00, 3.84, 9.12, 13.92, 16.80, 20.16, 30.24, 34.56 s);
the end card holds to 38.00 s. The four product passes start on beats 42, 47, 52, 57.

Music: D minor, i-VI-III-VII (Dm Bb F C), one chord per bar.
  scene 1        sub drone and riser from black, impact on the lime flash, arp fades in
  scenes 2-4     driving: four-on-the-floor kick, off-beat side-chained bass, claps, 16th hats, arp
  scene 5        breakdown: pads and sub only, riser into the passes
  scenes 6-7     full drop with lead stabs; whoosh on every pass and wipe, glitch stutters
  scene 8        final impact and a ringing chord to the end
Sound design: whooshes and risers into transitions, impacts on the big cuts, typewriter ticks
while labels type, ticks on the word slams and language cards.

Writes:
  src/videos/series-a-timeline.json          beats, scene frames, voiceover placements, typing (the video reads it)
  public/audio/Alert Global Tech - Series A Sorted Mix.wav
  docs/social/Alert Global Tech - Series A Sorted Captions.srt

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/make-series-a-audio.py
"""

import json
import subprocess

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, sosfilt

SR = 48000
FPS = 30
BPM = 125
BEAT = 60 / BPM
TOTAL = 38.0
DIR = "public/audio/"
TAKE = DIR + "Alert Global Tech - Series A Sorted Voiceover Take.mp3"
MIX_OUT = DIR + "Alert Global Tech - Series A Sorted Mix.wav"
SRT_OUT = "docs/social/Alert Global Tech - Series A Sorted Captions.srt"
TIMELINE_OUT = "src/videos/series-a-timeline.json"

b2s = lambda b: b * BEAT
b2f = lambda b: int(round(b * BEAT * FPS))

SCENES = {"open": 0, "more": 8, "prove": 19, "sidejob": 29, "sorted": 35, "bundle": 42, "supplier": 63, "end": 72}
PASSES = [42, 47, 52, 57, 63]
SLAMS = [8, 9, 11, 12, 14, 15]  # MORE / LAPTOPS / MORE / ACCESS / MORE / RISK
LANGS = [68, 69, 70]  # English / Español / Português
PIP = {"shrink": 23, "punch": 25}

# Phrases of the take (s, found from its pauses) and where each first syllable lands (beat).
# "More laptops. More access to manage." is one breath in the take; it is split at its dip.
PHRASES = [
    ((0.00, 1.80), 1, "What happens after the Series A?"),
    ((2.06, 2.98), 8, "More people."),
    ((3.14, None), 11, "More laptops."),
    ((None, 5.86), 14, "More access to manage."),
    ((6.16, 8.82), 19.15, "Then your first big customer asks one question."),
    ((9.13, 10.54), 25, "Can you prove it's secure?"),
    ((10.86, 13.38), 29.15, "That's when IT stops being a side job."),
    ((13.73, 16.39), 35.15, "So we built the Series A Compliance bundle."),
    ((16.55, 19.06), 42.1, "Dell and HP laptops, financed monthly."),
    ((19.21, 21.79), 47.1, "Microsoft 365 and Copilot."),
    ((21.97, 23.88), 52.2, "Every device managed and secured."),
    ((24.15, 26.81), 57.1, "And SOC 2 device evidence, built in."),
    ((27.00, 29.10), 63.1, "One supplier, from quote to setup."),
    ((29.30, 31.47), 67.7, "In English, Spanish or Portuguese."),
    ((31.64, 33.02), 72.15, "Series A, sorted."),
    ((33.29, 33.95), 76, "Book a Call."),
]
SPLIT_WINDOW = (3.9, 4.6)  # the dip between "laptops." and "More access"

# Typed labels: start beat, text, characters per second. The video types the same strings at the same rate.
TYPING = [
    {"beat": 1, "text": "what happens after", "cps": 22},
    {"beat": 42.5, "text": "Dell · HP — financed monthly", "cps": 30},
    {"beat": 52.5, "text": "Every device managed and secured", "cps": 32},
]

rng = np.random.default_rng(125)
N = int(TOTAL * SR)


def filt(x, kind, freq, order=2):
    return sosfilt(butter(order, freq, btype=kind, fs=SR, output="sos"), x)


def env(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)


def note(name):
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "Bb": 1, "B": 2}
    return 440.0 * 2 ** ((names[name[:-1]] + 12 * (int(name[-1]) - 4)) / 12)


def decode(path):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", path, "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"], check=True, capture_output=True
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).astype(np.float64)


def lufs(x):
    p = subprocess.run(
        ["ffmpeg", "-hide_banner", "-nostats", "-f", "f64le", "-ar", str(SR), "-ac", str(x.shape[1]), "-i", "-", "-af", "ebur128", "-f", "null", "-"],
        input=x.astype(np.float64).tobytes(),
        capture_output=True,
    ).stderr.decode()
    return float(p.split("I:")[-1].split("LUFS")[0])


def gain_to(x, target):
    return x * 10 ** ((target - lufs(x)) / 20)


class Bus:
    def __init__(self):
        self.L = np.zeros(N)
        self.R = np.zeros(N)

    def add(self, sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= N:
            return
        if i < 0:
            sig, i = sig[-i:], 0
        sig = sig[: N - i] * gain
        a = (pan + 1) * np.pi / 4
        self.L[i : i + len(sig)] += sig * np.cos(a)
        self.R[i : i + len(sig)] += sig * np.sin(a)

    def st(self):
        return np.stack([self.L, self.R], axis=1)


# ---------- Instruments ----------


def kick():
    n = int(0.42 * SR)
    t = np.arange(n) / SR
    f = 46 + 140 * np.exp(-t / 0.035)
    body = np.tanh(2.2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * env(n, 0.001, 0.17)
    click = filt(rng.standard_normal(n), "highpass", 3000) * env(n, 0.0005, 0.004)
    return body + 0.25 * click


def clap():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    noise = filt(rng.standard_normal(n), "bandpass", [900, 5000])
    e = sum(np.exp(-np.maximum(0, t - d) / 0.012) * (t >= d) for d in (0, 0.011, 0.022)) * 0.5 + np.exp(-t / 0.09) * 0.6
    return noise * e


def hat(open_=False):
    n = int((0.22 if open_ else 0.05) * SR)
    return filt(rng.standard_normal(n), "highpass", 8000) * env(n, 0.0005, 0.07 if open_ else 0.012)


def saw(f, n, detune=(-0.007, 0.0, 0.007)):
    t = np.arange(n) / SR
    return sum(2 * ((f * (1 + d) * t) % 1) - 1 for d in detune) / len(detune)


def bass_note(f, length):
    n = int(length * SR)
    x = filt(saw(f, n, (-0.004, 0.004)) + 0.6 * np.sin(2 * np.pi * f / 2 * np.arange(n) / SR), "lowpass", 900)
    return np.tanh(1.8 * x) * env(n, 0.003, length * 0.6)


def pad(freqs, length, cutoff=2400):
    n = int(length * SR)
    out = sum(saw(f, n) for f in freqs) / len(freqs)
    out = filt(out, "lowpass", cutoff)
    a, r = int(0.25 * SR), int(0.4 * SR)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return out * e


def pluck(f, length=0.2):
    n = int(length * SR)
    return filt(saw(f, n, (-0.003, 0.003)), "lowpass", 4200) * env(n, 0.002, 0.07)


def stab(freqs, length=0.35):
    n = int(length * SR)
    return np.tanh(1.4 * filt(sum(saw(f, n) for f in freqs) / len(freqs), "lowpass", 5000)) * env(n, 0.002, 0.14)


def sub(f, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.05) * np.minimum(1, (length - t) / 0.2)
    return np.sin(2 * np.pi * f * t) * e


def bell(f, length=3.0):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (1.2 / m)) for m, a in ((1, 1), (2.76, 0.3), (5.4, 0.12)))
    return tone * np.minimum(1, t / 0.002)


# ---------- Sound design ----------


def sweep(length, lo, hi, shape):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    bands = np.geomspace(lo, hi, 8)
    out = np.zeros(n)
    for k, fc in enumerate(bands):
        w = np.clip(1 - np.abs(t / length * (len(bands) - 1) - k), 0, 1)
        out += filt(noise, "bandpass", [fc * 0.7, fc * 1.4]) * w
    return out * shape(t / length)


def whoosh(length=0.5):
    return sweep(length, 250, 7000, lambda p: np.sin(np.pi * p) ** 2)


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * np.cumsum(200 * 2 ** (3 * t / length)) / SR) * 0.15
    return sweep(length, 300, 9000, lambda p: p**2.2) + tone * (t / length) ** 2


def impact(length=2.4):
    n = int(length * SR)
    t = np.arange(n) / SR
    f = 34 + 70 * np.exp(-t / 0.08)
    boom = np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * np.exp(-t / 0.7)
    crack = filt(rng.standard_normal(n), "bandpass", [600, 6000]) * np.exp(-t / 0.06)
    tail = filt(rng.standard_normal(n), "lowpass", 1200) * np.exp(-t / 0.9) * 0.15
    return boom + 0.5 * crack + tail


def tick():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "bandpass", [2500, 8000]) * np.exp(-t / 0.004) + 0.4 * np.sin(2 * np.pi * 3600 * t) * np.exp(-t / 0.003)


def key():
    n = int(0.05 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "bandpass", [1500, 6000]) * np.exp(-t / 0.006) + 0.3 * np.sin(2 * np.pi * rng.uniform(1800, 2600) * t) * np.exp(-t / 0.004)


def glitch_burst(length=0.18):
    n = int(length * SR)
    t = np.arange(n) / SR
    sq = np.sign(np.sin(2 * np.pi * rng.uniform(300, 900) * t)) * (np.floor(t * 60) % 2)
    return (0.5 * sq + filt(rng.standard_normal(n), "highpass", 2000) * 0.5) * np.exp(-t / 0.08)


# ---------- Timeline ----------

CHORDS = [["D3", "F3", "A3"], ["Bb2", "D3", "F3"], ["F3", "A3", "C4"], ["C3", "E3", "G3"]]
ROOTS = ["D2", "Bb1", "F2", "C2"]
ARP = [0, 1, 2, 1, 2, 0, 1, 2]
S = SCENES
END_BEAT = TOTAL / BEAT


def section(b):
    if b < S["more"]:
        return "open"
    if b < S["sorted"]:
        return "drive"
    if b < S["bundle"]:
        return "break"
    if b < S["end"]:
        return "drop"
    return "end"


def build_music():
    drums, bass, harm, fx = Bus(), Bus(), Bus(), Bus()
    pump = np.ones(N)  # side-chain from the kick
    nb = int(np.ceil(END_BEAT))
    for b in range(nb):
        t = b2s(b)
        sec = section(b)
        bar, beat = divmod(b, 4)
        chord = CHORDS[bar % 4]
        root = ROOTS[bar % 4]
        if sec == "open":
            if beat == 0:
                harm.add(pad([note(x) for x in chord], 4 * BEAT + 0.4, cutoff=900 + 300 * bar), t, 0.18)
                bass.add(sub(note(root), 4 * BEAT), t, 0.35)
            if b >= 1:
                for e in range(2):
                    harm.add(pluck(note(chord[ARP[(beat * 2 + e) % 8]]) * 2), t + e * BEAT / 2, 0.05 + 0.02 * b / 8, pan=0.35 if e else -0.35)
            if b >= 4:
                drums.add(kick(), t, 0.5 + 0.1 * (b - 4))
        elif sec in ("drive", "drop"):
            drums.add(kick(), t, 0.95)
            i = int(t * SR)
            k = np.arange(min(int(BEAT * SR), N - i)) / SR
            pump[i : i + len(k)] = np.minimum(pump[i : i + len(k)], 0.35 + 0.65 * np.minimum(1, k / 0.16))
            if beat in (1, 3):
                drums.add(clap(), t, 0.45)
            for e in range(4):
                drums.add(hat(), t + e * BEAT / 4, 0.16 if e == 2 else 0.07, pan=0.25)
            drums.add(hat(True), t + BEAT / 2, 0.08, pan=-0.2)
            bass.add(bass_note(note(root), BEAT / 2 - 0.01), t + BEAT / 2, 0.55)
            bass.add(bass_note(note(root) * 2, BEAT / 4), t + 3 * BEAT / 4, 0.25)
            if beat == 0:
                harm.add(pad([note(x) for x in chord] + [note(chord[0]) * 2], 4 * BEAT + 0.3, cutoff=3200 if sec == "drop" else 2200), t, 0.16)
            for e in range(4):
                f = note(chord[ARP[(beat * 4 + e) % 8]]) * (4 if sec == "drop" else 2)
                harm.add(pluck(f), t + e * BEAT / 4, 0.06, pan=-0.4 if e % 2 else 0.4)
            if sec == "drop" and beat in (0, 2) and (bar % 2 == 0 or beat == 0):
                harm.add(stab([note(x) * 2 for x in chord]), t + (BEAT * 0.75 if beat == 2 else 0), 0.12)
        elif sec == "break":
            if beat == 0 or b == S["sorted"]:
                harm.add(pad([note(x) for x in chord] + [note(chord[2]) * 2], 4 * BEAT + 0.6, cutoff=1500), t, 0.26)
                bass.add(sub(note(root), 4 * BEAT), t, 0.5)
            harm.add(pluck(note(chord[ARP[beat % 8]]) * 4, 0.5), t, 0.05, pan=0.3)
        else:  # end
            if b == S["end"]:
                harm.add(pad([note(x) for x in ["D3", "F3", "A3", "D4", "E4"]], TOTAL - t, cutoff=2600), t, 0.3)
                bass.add(sub(note("D2"), TOTAL - t), t, 0.5)
                harm.add(bell(note("A5"), 3.4), t, 0.12, pan=-0.2)
                harm.add(bell(note("D6"), 3.0), t + 2 * BEAT, 0.07, pan=0.2)
            if b < S["end"] + 4:
                drums.add(kick(), t, 0.7)
                if beat in (1, 3):
                    drums.add(clap(), t, 0.3)

    # Snare-style clap roll into the lime flash and the drop.
    for target in (S["sidejob"], S["bundle"]):
        for k in range(8):
            drums.add(clap(), b2s(target - 1) + k * BEAT / 8, 0.12 + 0.03 * k)

    # Pull-back while the footage shrinks into the frame (scene 3 picture-in-picture).
    a, b_ = int(b2s(PIP["shrink"]) * SR), int(b2s(PIP["punch"]) * SR)
    for bus in (harm, bass):
        for ch in (bus.L, bus.R):
            ch[a:b_] = filt(ch[a:b_], "lowpass", 600)

    # Glitch stutters on the last half-beat of some passes.
    for b in (S["prove"], PASSES[1], PASSES[3], S["supplier"]):
        i = int((b2s(b) - BEAT / 2) * SR)
        g = int(BEAT / 8 * SR)
        for bus in (drums, harm):
            for ch in (bus.L, bus.R):
                chunk = ch[i : i + g].copy()
                for r in range(4):
                    ch[i + r * g : i + (r + 1) * g] = chunk
        fx.add(glitch_burst(), b2s(b) - BEAT / 2, 0.1)

    music = drums.st() + (bass.st() + harm.st()) * pump[:, None]
    return music, fx


def build_sfx():
    sfx = Bus()
    # Risers into the big moments.
    for target, beats in ((S["more"], 4), (PIP["punch"], 2), (S["sidejob"], 3), (S["bundle"], 6), (S["end"], 2)):
        sfx.add(riser(b2s(beats)), b2s(target - beats), 0.22)
    # Impacts: lime flash, the hard cuts into the drops, the end card.
    for b in (1, S["more"], PIP["punch"], S["sidejob"], S["bundle"], S["end"]):
        sfx.add(impact(), b2s(b), 0.5 if b in (S["sidejob"], S["end"]) else 0.35)
    # Whooshes on every cut, wipe and pass.
    for b in (3, S["prove"], PIP["shrink"], S["sorted"], *PASSES[1:4], S["supplier"]):
        sfx.add(whoosh(0.55), b2s(b) - 0.32, 0.3, pan=rng.uniform(-0.3, 0.3))
    # Word slams and language cards.
    for b in SLAMS + LANGS:
        sfx.add(tick(), b2s(b), 0.4)
        sfx.add(kick(), b2s(b), 0.25)
    # Typewriter keys.
    for ty in TYPING:
        for c in range(len(ty["text"])):
            if ty["text"][c] != " ":
                sfx.add(key(), b2s(ty["beat"]) + c / ty["cps"], 0.18, pan=rng.uniform(-0.2, 0.2))
    return sfx


def place_voice():
    take = decode(TAKE)
    # Split "More laptops. More access to manage." at the quietest 20 ms in the window.
    a, b = (int(x * SR) for x in SPLIT_WINDOW)
    hop = int(0.02 * SR)
    rms = [np.sqrt(np.mean(take[i : i + hop] ** 2)) for i in range(a, b - hop, hop // 4)]
    split = (a + int(np.argmin(rms)) * (hop // 4) + hop // 2) / SR
    vo = np.zeros(N)
    thresh = 10 ** (-32 / 20) * np.max(np.abs(take))
    placed = []
    for (start, end), beat, text in PHRASES:
        start = split if start is None else start
        end = split if end is None else end
        seg = take[int(start * SR) : int(end * SR)].copy()
        loud = np.abs(seg) > thresh
        onset = int(np.argmax(loud))
        last = len(seg) - int(np.argmax(loud[::-1]))
        fade = int(0.01 * SR)
        seg[:fade] *= np.linspace(0, 1, fade)
        seg[-fade:] *= np.linspace(1, 0, fade)
        land = b2s(beat)
        i = int(round(land * SR)) - onset
        stop = min(N, i + len(seg))
        vo[i:stop] += seg[: stop - i]
        placed.append({"text": text, "start": round(land, 3), "end": round((i + last) / SR, 3)})
        print(f"  beat {beat:6.2f}  {land:6.2f}-{(i + last) / SR:6.2f}s  {text}")
    for p, q in zip(placed, placed[1:]):
        assert p["end"] <= q["start"] + 0.02, f"overlap: {p['text']} / {q['text']}"
    return vo, placed


def write_srt(placed):
    # Short phrases that follow each other closely share one caption.
    groups = [[0], [1, 2, 3], [4], [5], [6], [7], [8], [9], [10], [11], [12], [13], [14, 15]]
    ts = lambda s: f"{int(s // 3600):02d}:{int(s % 3600 // 60):02d}:{int(s % 60):02d},{int(round(s % 1 * 1000)) % 1000:03d}"
    out = []
    for n, g in enumerate(groups, 1):
        text = " ".join(placed[i]["text"] for i in g)
        nxt = placed[g[-1] + 1]["start"] - 0.04 if g[-1] + 1 < len(placed) else TOTAL
        out.append(f"{n}\n{ts(placed[g[0]]['start'])} --> {ts(min(placed[g[-1]]['end'] + 0.2, nxt))}\n{text}\n")
    with open(SRT_OUT, "w") as f:
        f.write("\n".join(out))


def write_timeline(placed):
    tl = {
        "fps": FPS,
        "bpm": BPM,
        "total": int(TOTAL * FPS),
        "beatFrames": BEAT * FPS,
        "scenes": {k: b2f(v) for k, v in S.items()},
        "passes": [b2f(b) for b in PASSES],
        "slams": [b2f(b) for b in SLAMS],
        "langs": [b2f(b) for b in LANGS],
        "pip": {k: b2f(v) for k, v in PIP.items()},
        "typing": [{"frame": b2f(t["beat"]), "text": t["text"], "cps": t["cps"]} for t in TYPING],
        "vo": [{"text": p["text"], "start": round(p["start"] * FPS), "end": round(p["end"] * FPS)} for p in placed],
    }
    with open(TIMELINE_OUT, "w") as f:
        json.dump(tl, f, indent=1, ensure_ascii=False)


print("Voiceover:")
vo, placed = place_voice()
write_timeline(placed)
write_srt(placed)
music, fx = build_music()
sfx = build_sfx()

# Side-chain: the music ducks up to 6 dB under the voice.
e = np.abs(vo)
sm = lfilter([1 - np.exp(-1 / (0.12 * SR))], [1, -np.exp(-1 / (0.12 * SR))], e)
duck = 10 ** (-6 * np.clip(sm / (0.2 * np.max(sm)), 0, 1) / 20)
vo_st = gain_to(np.stack([vo, vo], axis=1), -15)
music = gain_to(music, -22) * duck[:, None]
sfx_st = gain_to(sfx.st() + fx.st(), -24)
mix = vo_st + music + sfx_st
mix = np.tanh(mix * 0.9) / 0.9
mix = gain_to(mix, -15)
peak = np.max(np.abs(mix))
if peak > 10 ** (-1.5 / 20):
    mix /= peak / 10 ** (-1.5 / 20)
tail = int(1.2 * SR)
mix[-tail:] *= (np.linspace(1, 0, tail) ** 1.5)[:, None]
wavfile.write(MIX_OUT, SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
print(f"Wrote {MIX_OUT}: {TOTAL:.2f} s, {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
print(f"Wrote {TIMELINE_OUT} and {SRT_OUT}")
