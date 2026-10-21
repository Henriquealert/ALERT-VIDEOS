# Alert Global Tech — Video Studio

Remotion project that turns vendor content from Supabase `partner_content` into
~60 s marketing videos in three formats (16x9, 4x5, 9x16).

- Workflow, structure and rules: [`CLAUDE.md`](CLAUDE.md)
- Brand reference: [`docs/Alert Global Tech - Brand Guidelines 2026.md`](docs/Alert%20Global%20Tech%20-%20Brand%20Guidelines%202026.md)

## Setup

```bash
npm install
cp .env.example .env   # add SUPABASE_SERVICE_ROLE_KEY (never commit .env)
```

## Commands

```bash
npm run dev                                   # Remotion Studio (previews the sample spec)
npm run fetch                                 # pull unused rows into data/partner-content.json
npm run validate-spec -- data/specs/<slug>.json
npx remotion render AlertPromo-16x9 out/"Alert Global Tech - <Topic> Video 16x9.mp4" --props=data/specs/<slug>.json
npm run mark-used -- <row id>                 # only after the render is approved
npm run typecheck
```

## Layout

```
src/spec.ts        VideoSpec schema (one spec per video)
src/timing.ts      act boundaries
src/AlertPromo.tsx the five acts in sequence
src/acts/          one component per act
src/ui/            shared pieces and theme.tsx (brand tokens, fonts)
data/specs/        spec files (data-quality-article.json is the sample)
public/fonts/      self-hosted brand fonts + licences
public/brand/      logo (alert-global-tech-lockup-ivory.svg, required)
public/audio/      royalty-free audio + LICENSES.md
reference/         reference video (gitignored, never rendered)
```

## Custom browser

If Remotion can't download Chrome Headless Shell (blocked network, e.g. cloud
sessions), point it at an existing Chromium:

```bash
REMOTION_BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell npm run dev
```
