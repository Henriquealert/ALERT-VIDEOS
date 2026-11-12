# The Dot: assets to drop in

24 s text-led brand film (30 fps, 720 frames). Compositions: `TheDot-16x9`, `TheDot-9x16`,
and cut-downs `TheDot-Network-16x9/-9x16`, `TheDot-Copilot-16x9/-9x16`. The cut-downs still use the
default cards and destinations: they need their own content before rendering.

The video renders without any of these files. Each missing one is logged and skipped, and
`npm run render:16x9` / `render:9x16` list them first (`scripts/check-the-dot-assets.mjs`).

| File | What | If missing |
|---|---|---|
| `public/logo/monogram.svg` | a! monogram, **Ivory** artwork (the S4 hub, on blue) | Uses `public/brand/alert-global-tech-monogram-ivory.png`, cut from the approved wordmark by `python3 scripts/make-the-dot-monogram.py`; logs an error |
| `public/logo/wordmark.svg` | a!ert wordmark, **Ivory** artwork (S7, top-left on ink) | Uses `public/brand/alert-global-tech-wordmark-ivory.png`; logs an error |
| `public/music/pulse.mp3` | Minimal electronic pulse, royalty-free; at least 24 s | No music |
| `public/sfx/tick.wav` | Cursor tick (frames 0, 30 and 713) | No ticks |
| `public/sfx/land.wav` | Soft low thud as the dot lands (frame 566) | No thud |
| `public/vo/vo-*.mp3` | Voiceover, one file per line: `npm run vo` | Line skipped |

Record the licence of the music and both SFX in `public/audio/LICENSES.md`.

## Fonts

No font files to add. The brief asked for Helvetica Neue, but this project allows only the
brand fonts in `public/fonts/` (`npm run check-fonts` fails on anything else), so the film is set
in DM Sans Bold and Regular (normal width, never condensed), as in the earlier videos that named
Helvetica in the brief.

## Voiceover

1. Add `ELEVENLABS_API_KEY` and `ELEVENLABS_VOICE_ID` to `.env` (see `.env.example`).
2. `npm run vo` creates the main film lines (`--set network`, `--set copilot` or `--set all` for the cut-downs;
   `--force` regenerates existing files; `--check` only measures).
3. The script stops with an error if a line would run past its scene, and prints by how many frames.
   Move the start frame in `src/videos/the-dot/vo-lines.ts` (or the cut in `timeline.ts`). Never time-stretch the audio.

At 30 fps, `vo-s5` ("From quote to setup, in English, Spanish or Portuguese.") has 112 frames
(3.7 s) and `vo-s7` has 80 frames (2.7 s). Those two are the most likely to overrun.

## Tuning

- Dot path: `src/dot/keyframes.ts` (one table, S1 to S7).
- Scene and beat frames: `src/videos/the-dot/timeline.ts`.
- Layout for both aspect ratios: `src/videos/the-dot/geometry.ts`.

## Render

```bash
npm run render:16x9
```

```bash
npm run render:9x16
```
