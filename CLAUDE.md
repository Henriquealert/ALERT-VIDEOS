# Alert Global Tech — Video Studio

Remotion project that turns vendor content from Supabase into short marketing videos.
Read this whole file before writing any scene code.

## Pipeline

1. `npm run fetch` pulls unused rows from Supabase `public.partner_content` into
   `data/partner-content.json`. Read-only. Never query any other table.
2. To make a video, pick one row and write a spec to `data/specs/<slug>.json`
   that validates against `VideoSpec` in `src/spec.ts`. Every line of on-screen
   text must come from that row (topic_title, topic_summary, item_description,
   social_post_text, email_body) or be a short rewrite of it.
3. Check the spec, preview in Remotion Studio, then render each format:
   `npm run validate-spec -- data/specs/<slug>.json`
   `npx remotion render AlertPromo-16x9 out/"Alert Global Tech - <Topic> Video 16x9.mp4" --props=data/specs/<slug>.json`
   (repeat with `AlertPromo-4x5` and `AlertPromo-9x16`).
4. Only after Henrique approves the render in chat: `npm run mark-used -- <row id>`.
   Never run it on your own initiative.

## Structure (copied from the reference video, ~60 s at 30 fps)

The reference is a three-act "chaos → calm" piece. Keep the acts, pacing and
devices; render them in the brand identity (below), not the reference's look.

| Act | Time | What happens |
|---|---|---|
| 1. Title | 0–5 s | Huge statement title (2–3 words, from `hook`) in Archivo Narrow Bold Italic caps, ending in a lime full stop. Pixel cursors drift and click it; the letters then crumble into falling blue, lime and ivory blocks. |
| 2. Chaos | 5–20 s | Retro desktop on Deep Ink with a fine blue grid. Old-OS dialog windows pop up one at a time with the pain points (`painPoints[]`), then multiply until they bury the screen. Pixel flames in the blue family lick the window tops. Snap cut to one big Archivo numeral (`stat`) with a blinking lime dot — skip this beat if `stat` is null. |
| 3. Maze | 20–30 s | Isometric maze with sky-lit walls, cursors wandering lost, camera pulls back to show the whole maze. This is the "it's complicated" beat. |
| 4. Calm | 30–50 s | Hard cut to a clean Soft Ivory product UI. A prompt box types `prompt` letter by letter, send button pulses, an answer card appears with inline chips, then 2–3 UI cards from `uiCards[]` (checklist ticking down, comparison table, score bars filling). Generous whitespace, slow eased motion. |
| 5. Close | 50–60 s | Top-down maze dissolves, cut to end card on Deep Ink: Ivory lockup centred, lime pill CTA below (`cta`), block composition bottom-right, line arrow bottom-left. |

Pacing rules from the reference: cuts every 1.5–3 s in acts 1–3, slower holds in
act 4, every pop/click lands on a beat. Chaos acts are loud and crowded; the calm
act is quiet and spacious. That contrast is the whole idea.

## Brand

The only brand reference is `docs/Alert Global Tech - Brand Guidelines 2026.md`.
Read it before writing scene code; if anything here disagrees with it, the guide wins.
Tokens live in `src/ui/theme.tsx`; never hard-code a hex value in a scene.

How the guide applies to video:
- Colour: Deep Ink ground for acts 1–3 and 5, Soft Ivory for act 4. Electric Blue
  and Acid Lime are accents; lime for the full stop, click rings and the CTA pill.
  Gradients only on blue (blue → #9DBDF5 → #E2ECFA, or blue → #0B2A7A), never on lime.
  Never blue text on ink or ink text on blue.
- Fonts: ONLY the supplied brand fonts in `public/fonts/` — Archivo Narrow,
  DM Sans, Instrument Serif. No other font may be used anywhere, including props,
  fallbacks and web fonts. This overrides the guide's Archivo ExtraBold and DM Mono.
  `npm run check-fonts` (part of `npm run typecheck`) fails on anything else.
- Type roles: statement Archivo Narrow Bold Italic caps; headlines DM Sans SemiBold,
  sentence case, left-aligned, tight leading (as in the brand Story layouts);
  big numerals Archivo Narrow Bold; editorial accent Instrument Serif Italic (one or
  two words only); UI text, eyebrows, badges and tags DM Sans. Headlines end in the
  coloured full stop (`<Dot>`). Accent rule: colour the last phrase or switch it to
  Instrument Serif Italic, not both.
- Scene layout (brand Story mock-ups, `src/ui/Story.tsx`): every scene uses the
  Story frame — wordmark top-left on dark grounds, a blue badge pill (channel or
  series label) under it, big left-aligned sentence-case headline in DM Sans
  SemiBold, a block composition (blue-gradient, lime and blue squares) lower right,
  and a thin line arrow bottom-left. Use `StoryChrome`, `StoryHeadline`, `Badge`,
  `BlockStack`, `LineArrow`. Grounds rotate ink, blue, ivory.
- Graphic elements: two or three per video. This template uses blocks (act 1 and end card),
  a fine blue grid (act 2) and the line arrow (Story frame).
- Logo: every video ends on our lockup, `public/brand/alert-global-tech-lockup-ivory.png`,
  centred on the Deep Ink end card. Scenes before it carry the wordmark top-left
  (`alert-global-tech-wordmark-ivory.png`, cut from the same file). Only one logo is
  on screen at a time. Ivory artwork only, so no logo on ivory scenes until an Ink
  file is supplied. Never recolour, stretch, redraw or typeset it.
- Calls to action: one per video, title-style capitals: Talk to an Expert,
  Request a Quote, Learn More.
- Stories (9x16): keep the top and bottom 250px clear (`safeY` in `useLayout`).
- No emoji, no exclamation marks, no hype words, no shadows on headlines.
- Never describe customers as "small and mid-sized businesses" or "SMBs".

## Content rules

- Never invent numbers, clients, testimonials, prices, stock or delivery dates.
  `stat` must quote a figure from the row and carry `statSource`; otherwise null.
- Vendor names in UI cards must be real products we sell (Dell, HP, Lenovo, Apple,
  Cisco, Fortinet, Ubiquiti, Microsoft 365, Copilot, SharePoint…). Don't put
  competitor brands or made-up prices in tables.
- Gated content (content_type contains "Gated"): the CTA points to the asset,
  not to the content itself.

## One-off videos

Fixed-copy videos live in `src/videos/` and are registered in `src/Root.tsx`:
- `LaptopsSorted-9x16` — 20 s, 1080×1920, 24 fps, one continuous shot, captions only.
  `npx remotion render LaptopsSorted-9x16 out/"Alert Global Tech - Laptops Sorted Video 9x16.mp4"`
- `TechUpdates-Windows11-9x16` — "Tech updates for you": Windows 11 Pro for Business. 30 s,
  1080×1920, 24 fps, five flat story cards, built from partner_content row
  97022741-9b72-4593-ba1f-1da6089b2e14 (gated eBook). By request the eBook is not offered;
  the CTA is "Talk to an Expert" and the end card has no voice line.
  One block tower carries the story across the cards. 120 BPM grid: 1 beat = 12 frames,
  animations on 6-frame (0.25 s) steps, card changes at 0:00, 0:04, 0:10, 0:20, 0:26.
  Music (soft bed, no vocals): `python3 scripts/make-story-music.py "public/audio/Alert Global Tech - Tech Updates Windows 11 Music.wav"`.
  Voiceover (ElevenLabs, "Everett - Confident American Ads") is placed and mixed by
  `python3 scripts/mix-story-voiceover.py`; line times are at the top of that script and
  match the times in the video code.
  `npx remotion render TechUpdates-Windows11-9x16 out/"Alert Global Tech - Tech Updates Windows 11 Video 9x16.mp4"`
  LinkedIn feed cut (4:5, 1080×1350, same story and audio; layout tightens via the `FEED` layout):
  `npx remotion render TechUpdates-Windows11-4x5 out/"Alert Global Tech - Tech Updates Windows 11 Video LinkedIn 4x5.mp4" --crf=18`
  Post copy, alt text and captions (.srt) are in `docs/social/`.
- `SecuritySorted-4x5` / `SecuritySorted-16x9` — "Security, sorted." Windows 11 Pro laptops. 22 s, 30 fps,
  1080×1350 and 1920×1080, seven hard-cut shots on a 120 BPM grid (1 beat = 15 frames), editorial kinetic
  type with halftone cut-outs, no voiceover. Built on partner_content row 97022741 (chip-to-cloud security,
  balanced innovation and protection); closing lines are the guide's platform and support lines. CTA Request a Quote.
  Halftone art (tokens, laptop) and the a! monogram crop: `python3 scripts/make-halftone-cutouts.py` (writes `public/art/`).
  Music and ticks: `python3 scripts/make-security-sorted-audio.py "public/audio/Alert Global Tech - Security Sorted Music.wav"`;
  token frames at the top of that script match `TOKEN_LAND` / `TOKEN_CLICK` in the video code.
  `npx remotion render SecuritySorted-4x5 out/"Alert Global Tech - Security Sorted Video LinkedIn 4x5.mp4" --crf=18`
  `npx remotion render SecuritySorted-16x9 out/"Alert Global Tech - Security Sorted Video 16x9.mp4" --crf=18`

## Formats

Register one composition per format, all driven by the same spec:
`AlertPromo-16x9` 1920×1080, `AlertPromo-4x5` 1080×1350, `AlertPromo-9x16` 1080×1920.
Lay out with relative units so all three work.

## Code conventions

- One component per act in `src/acts/`, shared pieces in `src/ui/`
  (PixelWindow, PixelCursor, IsoMaze, PromptBox, ChecklistCard, CompareTable, ScoreBars, EndCard).
- Fonts load only through `src/ui/theme.tsx` from `public/fonts/` (each family's `OFL.txt` is its licence). Never load web fonts.
- Seed anything random (`random('seed-' + spec.slug)`) so re-renders match.
- Use `spring()` / `interpolate()`; no CSS transitions.
- Music and SFX go in `public/audio/`, royalty-free only; record the licence in `public/audio/LICENSES.md`.

## Data handling

- Keys live in `.env` (gitignored). Never print them or commit them.
- Never read `leads` or `email_templates`, and never put lead or customer data in a video.
- No deletes, ever.
