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
| 5. Close | 50–60 s | Top-down maze dissolves, cut to end card on Deep Ink: Ivory logo centred, lime pill CTA below (`cta`), channel tag bottom-left, one blue-to-sky arrow bottom-right, its tail bleeding off the bottom edge. |

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
- Type: statement Archivo Narrow Bold Italic caps (act 1); headline and numerals
  Archivo ExtraBold; editorial accent Instrument Serif Italic (one or two words only);
  UI text and eyebrow labels DM Sans; tags DM Mono caps. Headlines end in the
  coloured full stop (`<Dot>`). Accent rule: colour the last phrase or switch it to
  Instrument Serif Italic, not both.
- Always use our fonts, and only our fonts: Archivo, Archivo Narrow, Instrument Serif,
  DM Sans, DM Mono (self-hosted in `public/fonts/`). No pixel or other fonts, even for
  props: the act 2 old-OS dialogs use DM Mono caps.
- Graphic elements: two or three per video. This template uses blocks (act 1),
  a fine blue grid (act 2) and one arrow (end card).
- Logo: every video ends on our logo. One per video, on the end card only: the
  approved Ivory lockup `public/brand/alert-global-tech-lockup-ivory.png` on Deep Ink.
  Never recolour, stretch, redraw or typeset it. Renders fail if the file is missing.
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

## Formats

Register one composition per format, all driven by the same spec:
`AlertPromo-16x9` 1920×1080, `AlertPromo-4x5` 1080×1350, `AlertPromo-9x16` 1080×1920.
Lay out with relative units so all three work.

## Code conventions

- One component per act in `src/acts/`, shared pieces in `src/ui/`
  (PixelWindow, PixelCursor, IsoMaze, PromptBox, ChecklistCard, CompareTable, ScoreBars, EndCard).
- Fonts are self-hosted in `public/fonts/` (licences in `LICENSES.md` there); don't load web fonts at render time.
- Seed anything random (`random('seed-' + spec.slug)`) so re-renders match.
- Use `spring()` / `interpolate()`; no CSS transitions.
- Music and SFX go in `public/audio/`, royalty-free only; record the licence in `public/audio/LICENSES.md`.

## Data handling

- Keys live in `.env` (gitignored). Never print them or commit them.
- Never read `leads` or `email_templates`, and never put lead or customer data in a video.
- No deletes, ever.
