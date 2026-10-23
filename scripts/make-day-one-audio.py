"""Music, sound design and voiceover mix for "Day One, Sorted." (DayOneSorted-* compositions).

Everything here is original and synthesised (no samples) except the voiceover: one ElevenLabs take per
cut (voice: Ray D - Adult Male Energetic and Engaging American, model eleven_v4), each played whole
from its offset in src/videos/day-one-timeline.json.

Music, 120 BPM (1 beat = 0.5 s = 12 frames at 24 fps):
  hook, desk, chaos, tabs, tangle   lo-fi glitchy synth with drums from the first frame, building
  cut to the ivory "fix" scene      hard cut, a breath of silence
  fix, resolve, end                 clean, warm, driving pulse (four-on-the-floor felt kick) to the end
Sound design: cursor clicks on the hook letters and the tab drag, rising dialog-box chimes in the
chaos scene, soft ticks on the checklist, a snap and an arrow swish in the resolve, a whoosh on the
lime wipe.

Scene lengths and event frames are read from src/videos/day-one-timeline.json (built by
scripts/make-day-one-timeline.py), the same file the video code reads.

Run (numpy + scipy, ffmpeg on PATH):
  python3 scripts/make-day-one-audio.py
Writes the 60 s mix (16x9 and 9x16) and the 30 s feed mix (4x5) to public/audio/.
"""

import json
import subprocess

import numpy as np
from scipy.io import wavfile
from scipy.signal import butter, lfilter, sosfilt

SR = 48000
FPS = 24
BEAT = 0.5
DIR = "public/audio/"
TAKES = {
    "full": DIR + "Alert Global Tech - Day One Sorted Voiceover Take.mp3",
    "feed": DIR + "Alert Global Tech - Day One Sorted Feed Voiceover Take.mp3",
}
OUT = {
    "full": DIR + "Alert Global Tech - Day One Sorted Mix.wav",
    "feed": DIR + "Alert Global Tech - Day One Sorted Feed Mix.wav",
}
with open("src/videos/day-one-timeline.json") as fh:
    TL = json.load(fh)
HOOK_ARRIVE = [8 + i * 2 for i in range(19)]  # NEW HIRE STARTS MONDAY: 19 letters, as in the video code
FLOOD_N = 36

rng = np.random.default_rng(160)


def filt(x, kind, freq, order=2):
    return sosfilt(butter(order, freq, btype=kind, fs=SR, output="sos"), x)


def env(n, a, r):
    t = np.arange(n) / SR
    return np.minimum(1, t / max(a, 1e-4)) * np.exp(-t / r)


def note(name):
    names = {"C": -9, "D": -7, "E": -5, "F": -4, "G": -2, "A": 0, "Bb": 1, "B": 2}
    return 440.0 * 2 ** ((names[name[:-1]] + 12 * (int(name[-1]) - 4)) / 12)


def crush(x, bits=6, hold=4):
    q = 2 ** (bits - 1)
    y = np.round(x * q) / q
    return np.repeat(y[::hold], hold)[: len(x)]


class Bus:
    def __init__(self, n):
        self.L = np.zeros(n)
        self.R = np.zeros(n)

    def add(self, sig, t, gain=1.0, pan=0.0):
        i = int(round(t * SR))
        if i >= len(self.L) or i < 0:
            return
        sig = sig[: len(self.L) - i] * gain
        a = (pan + 1) * np.pi / 4
        self.L[i : i + len(sig)] += sig * np.cos(a)
        self.R[i : i + len(sig)] += sig * np.sin(a)

    def st(self):
        return np.stack([self.L, self.R], axis=1)


# ---------- Instruments ----------


def saw_pad(freqs, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for dt in (-0.006, 0.0, 0.006):
            out += 2 * ((f * (1 + dt) * t) % 1) - 1
    out = filt(out / (3 * len(freqs)), "lowpass", 1800)
    a = int(0.05 * SR)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[-a:] *= np.linspace(1, 0, a)
    return crush(out * e, bits=7, hold=3)


def lofi_kick():
    n = int(0.3 * SR)
    t = np.arange(n) / SR
    f = 48 + 90 * np.exp(-t / 0.03)
    return crush(np.tanh(2 * np.sin(2 * np.pi * np.cumsum(f) / SR)) * env(n, 0.002, 0.12), 8, 2)


def lofi_snare():
    n = int(0.22 * SR)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 190 * t) * env(n, 0.001, 0.05)
    noise = filt(rng.standard_normal(n), "bandpass", [1200, 6000]) * env(n, 0.001, 0.07)
    return crush(0.6 * body + noise, 6, 4)


def hat():
    n = int(0.05 * SR)
    return crush(filt(rng.standard_normal(n), "highpass", 7000) * env(n, 0.001, 0.012), 6, 2)


def square_pluck(f, length=0.18):
    n = int(length * SR)
    t = np.arange(n) / SR
    return crush(filt(np.sign(np.sin(2 * np.pi * f * t)) * env(n, 0.002, 0.06), "lowpass", 3000), 5, 3)


def crackle(length):
    n = int(length * SR)
    x = np.zeros(n)
    idx = rng.integers(0, n, int(length * 30))
    x[idx] = rng.standard_normal(len(idx))
    return filt(x, "bandpass", [800, 5000]) + 0.02 * filt(rng.standard_normal(n), "lowpass", 600)


def riser(length):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    # sweep a band-pass up by blending a few fixed bands
    for k, fc in enumerate([400, 900, 2000, 4500, 9000]):
        w = np.clip(1 - np.abs(t / length * 4 - k), 0, 1)
        out += filt(noise, "bandpass", [fc * 0.7, fc * 1.4]) * w
    return out * (t / length) ** 2


def warm_pad(freqs, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros(n)
    for f in freqs:
        for dt in (-0.002, 0.002):
            ph = 2 * np.pi * f * (1 + dt) * t
            out += np.sin(ph) + 0.2 * np.sin(2 * ph)
    out = filt(out / (2 * len(freqs)), "lowpass", 1200)
    a, r = int(0.6 * SR), int(0.8 * SR)
    e = np.ones(n)
    e[:a] = np.linspace(0, 1, a)
    e[-r:] *= np.linspace(1, 0, r)
    return out * e


def soft_pulse(f, length=0.35):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = np.sin(2 * np.pi * f * t) + 0.15 * np.sin(4 * np.pi * f * t)
    return filt(tone * env(n, 0.006, 0.11), "lowpass", 1600)


def sub_note(f, length):
    n = int(length * SR)
    t = np.arange(n) / SR
    e = np.minimum(1, t / 0.02) * np.minimum(1, (length - t) / 0.08)
    return np.tanh(1.5 * np.sin(2 * np.pi * f * t)) * e


def soft_clap():
    n = int(0.18 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "bandpass", [900, 4000]) * np.exp(-t / 0.05) * np.minimum(1, t / 0.003)


def felt_kick():
    n = int(0.35 * SR)
    t = np.arange(n) / SR
    f = 50 + 30 * np.exp(-t / 0.05)
    return filt(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.minimum(1, t / 0.004) * np.exp(-t / 0.16), "lowpass", 160)


def bell(f, length=2.5):
    n = int(length * SR)
    t = np.arange(n) / SR
    tone = sum(a * np.sin(2 * np.pi * f * m * t) * np.exp(-t / (0.8 / m)) for m, a in ((1, 1), (2.76, 0.3), (5.4, 0.1)))
    return tone * np.minimum(1, t / 0.002)


# ---------- Sound design ----------


def click():
    n = int(0.03 * SR)
    t = np.arange(n) / SR
    return filt(rng.standard_normal(n), "bandpass", [2500, 7000]) * np.exp(-t / 0.004) + 0.4 * np.sin(2 * np.pi * 3200 * t) * np.exp(-t / 0.003)


def chime(f, length=0.6):
    n = int(length * SR)
    t = np.arange(n) / SR
    a = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.18)
    b = np.sin(2 * np.pi * f * 1.5 * t) * np.exp(-np.maximum(0, t - 0.09) / 0.2) * (t > 0.09)
    return (a + 0.8 * b) * np.minimum(1, t / 0.002)


def blip(f):
    n = int(0.09 * SR)
    t = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * f * t)) * np.exp(-t / 0.025) * 0.6


def bonk():
    n = int(0.5 * SR)
    t = np.arange(n) / SR
    return (np.sin(2 * np.pi * 330 * t) + 0.7 * np.sin(2 * np.pi * 247 * t)) * np.exp(-t / 0.16) * np.minimum(1, t / 0.003)


def whoosh(length, lo=300, hi=6000):
    n = int(length * SR)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    bands = np.geomspace(lo, hi, 6)
    for k, fc in enumerate(bands):
        w = np.clip(1 - np.abs(t / length * (len(bands) - 1) - k), 0, 1)
        out += filt(noise, "bandpass", [fc * 0.7, fc * 1.4]) * w
    return out * np.sin(np.pi * t / length) ** 2


# ---------- Build ----------

CHAOS_CHORDS = [["D3", "F3", "A3"], ["Bb2", "D3", "F3"], ["F3", "A3", "C4"], ["C3", "E3", "G3"]]
CHAOS_ROOTS = ["D2", "Bb1", "F2", "C2"]
WARM_CHORDS = [["F3", "A3", "C4", "E4"], ["A2", "E3", "G3", "C4"], ["D3", "F3", "A3", "C4"], ["Bb2", "D3", "F3", "A3"]]
WARM_PULSE = ["C5", "A4", "F4", "A4", "C5", "A4", "G4", "A4"]
LEVEL = {"hook": 2, "desk": 3, "chaos": 4, "tabs": 2, "tangle": 4}


def build(cut):
    tl = TL[cut]
    plan = tl["scenes"]
    starts, t0 = {}, 0.0
    for name, n in plan:
        starts[name] = (t0, n / FPS)
        t0 += n / FPS
    total = t0
    N = int(round(total * SR))
    loud, calm, sfx = Bus(N), Bus(N), Bus(N)
    calm_from = starts["resolve"][0] if "fix" not in starts else starts["fix"][0]
    loud_end = calm_from  # the hard cut to silence

    # Lo-fi build, beat by beat, over the loud scenes.
    b = 0
    while b * BEAT < loud_end - 1e-6:
        t = b * BEAT
        scene = next(s for s, (a, d) in starts.items() if a <= t < a + d)
        lvl = LEVEL[scene]
        bar, beat = divmod(b, 4)
        if beat == 0:
            loud.add(saw_pad([note(x) for x in CHAOS_CHORDS[bar % 4]], 4 * BEAT), t, 0.22)
            loud.add(crackle(4 * BEAT), t, 0.05)
        if lvl >= 2 and beat in (0, 2):
            loud.add(lofi_kick(), t, 0.5)
        if lvl >= 3:
            if lvl >= 4 and beat in (1, 3):
                loud.add(lofi_kick(), t + BEAT / 2, 0.3)
            if beat in (1, 3):
                loud.add(lofi_snare(), t, 0.32)
            for e in range(4 if lvl >= 4 else 2):
                loud.add(hat(), t + e * BEAT / (4 if lvl >= 4 else 2), 0.10 if e % 2 else 0.06, pan=0.3)
            chord = CHAOS_CHORDS[bar % 4]
            for e in range(4):
                f = note(chord[(b * 4 + e) % 3]) * 4
                loud.add(square_pluck(f), t + e * BEAT / 4, 0.05, pan=-0.3 if e % 2 else 0.3)
        if lvl >= 4 and beat == 0:
            loud.add(crush(np.sin(2 * np.pi * note(CHAOS_ROOTS[bar % 4]) * np.arange(int(4 * BEAT * SR)) / SR), 5, 2) * 0.6, t, 0.25)
        b += 1

    # Tabs: the build pulls back under a low-pass for the "every tab open" line.
    if "tabs" in starts:
        a, d = starts["tabs"]
        i, j = int(a * SR), int((a + d) * SR)
        for ch in (loud.L, loud.R):
            ch[i:j] = filt(ch[i:j], "lowpass", 700)
    # Tangle: glitch stutters on random off-beats, a riser into the cut.
    if "tangle" in starts:
        a, d = starts["tangle"]
        for k in range(int(d / BEAT)):
            t = a + k * BEAT
            if k % 4 in (1, 3) and rng.random() < 0.35 + 0.5 * k / (d / BEAT):
                i = int((t + BEAT / 2) * SR)
                g = int(0.0625 * SR)
                for ch in (loud.L, loud.R):
                    chunk = ch[i - g : i].copy()
                    for r in range(4):
                        ch[i + r * g : i + (r + 1) * g] = chunk
        loud.add(riser(d * 0.6), a + d * 0.4, 0.12)
    # Hard cut: nothing from the loud bus after the switch to ivory.
    cut_i = int(loud_end * SR)
    loud.L[cut_i:] = 0
    loud.R[cut_i:] = 0
    fade = int(0.004 * SR)
    for ch in (loud.L, loud.R):
        ch[cut_i - fade : cut_i] *= np.linspace(1, 0, fade)

    # Warm minimal pulse: after a beat or two of silence, to the end.
    warm_start = np.ceil((calm_from + 0.35) / (BEAT / 2)) * (BEAT / 2)
    k = 0
    while warm_start + k * BEAT < total - 1e-6:
        t = warm_start + k * BEAT
        bar, beat = divmod(k, 4)
        in_end = t >= starts["end"][0]
        chord = ["F3", "A3", "C4", "F4"] if in_end else WARM_CHORDS[bar % 4]
        if beat == 0:
            calm.add(warm_pad([note(x) for x in chord], 4 * BEAT + 0.6), t, 0.3)
            calm.add(sub_note(note(chord[0]) / 2, 4 * BEAT), t, 0.22)
        calm.add(felt_kick(), t, 0.42)
        calm.add(hat(), t + BEAT / 2, 0.05, pan=0.25)
        if beat in (1, 3):
            calm.add(soft_clap(), t, 0.10)
        for e in range(2):
            p = WARM_PULSE[(beat * 2 + e) % 8]
            calm.add(soft_pulse(note(p)), t + e * BEAT / 2, 0.10 if e == 0 else 0.06, pan=-0.2 if e else 0.2)
        k += 1
    a_end = starts["end"][0]
    calm.add(bell(note("F5"), 4.0), a_end, 0.12, pan=-0.15)
    calm.add(bell(note("C6"), 4.0), a_end + 2 * BEAT, 0.06, pan=0.15)

    # Sound design, at the timeline's event frames.
    s = lambda scene, frames: starts[scene][0] + frames / FPS
    for fr in HOOK_ARRIVE:
        sfx.add(click(), s("hook", fr), 0.35, pan=rng.uniform(-0.6, 0.6))
    if "desk" in starts:
        for fr, _ in tl["desk"]:
            sfx.add(lofi_kick(), s("desk", fr), 0.5)
    ch = tl["chaos"]
    scale = ["D5", "F5", "G5", "A5", "C6", "D6"]
    for i, fr in enumerate(sorted(ch["main"])):
        sfx.add(chime(note(scale[i])), s("chaos", fr), 0.22, pan=rng.uniform(-0.4, 0.4))
    a_, b_ = ch["flood"]
    for k in range(FLOOD_N):
        fr = a_ + (b_ - a_) * (k / FLOOD_N) ** 0.75
        sfx.add(blip(800 * 2 ** (k / 18)), s("chaos", fr), 0.05, pan=rng.uniform(-0.8, 0.8))
    sfx.add(chime(note("F6")), s("chaos", ch["cooked"]), 0.25)
    sfx.add(bonk(), s("chaos", ch["cooked"]), 0.3)
    sfx.add(click(), s("tabs", tl["tabs"]["drag"][0]), 0.4)
    sfx.add(click(), s("tabs", tl["tabs"]["drag"][1]), 0.25)
    if "tangle" in starts:
        for fr, _ in tl["tangle"]:
            sfx.add(click(), s("tangle", fr), 0.2)
    fx = tl["fix"]
    for fr in fx["rows"]:
        sfx.add(click(), s("fix", fr), 0.12)
    for fr in fx["ticks"]:
        sfx.add(click(), s("fix", fr), 0.18)
        sfx.add(soft_pulse(note("C6"), 0.3), s("fix", fr), 0.06)
    sfx.add(chime(note("A5")), s("fix", fx["ready"]), 0.12)
    sfx.add(click(), s("resolve", tl["resolve"]["snap"]), 0.25)
    sfx.add(whoosh(1.4, 200, 3000), s("resolve", tl["resolve"]["arrow"]), 0.08, pan=0.3)
    sfx.add(whoosh(0.6), a_end - 0.12, 0.16, pan=0.0)

    # Voiceover: the cut's take, whole, from its offset.
    vo = np.zeros(N)
    take = decode(TAKES[cut])
    i = int(round(tl["voOffset"] * SR))
    end = min(N, i + len(take))
    vo[i:end] = take[: end - i]
    print(f"  {cut}: voiceover {len(take) / SR:.2f} s from {tl['voOffset']:.2f} s")
    return total, loud.st(), calm.st(), sfx.st(), vo


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


for cut in ("full", "feed"):
    total, loud, calm, sfx, vo = build(cut)
    N = len(vo)
    # Sidechain: music ducks up to 6 dB under the voice.
    e = np.abs(vo)
    sm = lfilter([1 - np.exp(-1 / (0.15 * SR))], [1, -np.exp(-1 / (0.15 * SR))], e)
    duck = 10 ** (-6 * np.clip(sm / (0.2 * np.max(sm)), 0, 1) / 20)
    vo_st = gain_to(np.stack([vo, vo], axis=1), -16)
    loud = gain_to(loud, -21) * duck[:, None]  # the chaos is meant to be loud
    calm = gain_to(calm, -27) * duck[:, None]  # the bed under the voice
    sfx = gain_to(sfx, -24)
    mix = vo_st + loud + calm + sfx
    mix = np.tanh(mix * 0.95) / 0.95
    mix = gain_to(mix, -16)
    peak = np.max(np.abs(mix))
    if peak > 10 ** (-1.5 / 20):
        mix /= peak / 10 ** (-1.5 / 20)
    f15 = int(1.5 * SR)
    mix[-f15:] *= (np.linspace(1, 0, f15) ** 1.5)[:, None]
    wavfile.write(OUT[cut], SR, (np.clip(mix, -1, 1) * 32767).astype(np.int16))
    print(f"Wrote {OUT[cut]}: {total:.2f} s, {lufs(mix):.1f} LUFS, peak {20 * np.log10(np.max(np.abs(mix))):.1f} dBFS")
