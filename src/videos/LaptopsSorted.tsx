import { AbsoluteFill, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { Badge, BlockStack, LineArrow, StoryHeadline, Wordmark } from "../ui/Story";
import { C, F } from "../ui/theme";

// "Laptops, sorted." — 20 s, 9x16, 24 fps, one continuous shot, captions only (no voiceover).
// Built on the 2026 brand and its Story layout: wordmark top-left, badge, big left-aligned
// headline, block composition, line arrow bottom-left. Brand fonts only.

export const LAPTOPS_SORTED = { fps: 24, durationInFrames: 480, width: 1080, height: 1920 } as const;

const s = (sec: number) => Math.round(sec * LAPTOPS_SORTED.fps);

const COPY = {
  label: "NO. 01 — HARDWARE",
  captions: [
    { lines: ["Still running", "Windows 10?"], dot: false, from: s(0.5), to: s(3) },
    // Microsoft: Windows 10 support ended 14 October 2025 (microsoft.com/windows/end-of-support).
    { lines: ["Free security", "updates ended", "October 2025"], dot: true, from: s(3.2), to: s(7) },
    { lines: ["Windows 11 Pro", "on Dell, HP", "and Lenovo"], dot: true, from: s(7.4), to: s(13) },
  ],
  headline: { lines: ["Laptops,", ""], accent: "sorted" }, // accent in lime, then the lime full stop
  sub: "One supplier, from quote to setup.",
  cta: "Request a Quote",
  url: "alertglobal.tech", // confirmed by Henrique, 21 Oct 2026
};

const W = 1080;
const H = 1920;
const SAFE = 250; // Story top/bottom safe zone
const SIDE = 72; // left/right margin
const TEXT_TOP = 560; // headline block top, under the badge
const TEXT_Y = 800; // centre of the headline block, for dimming the pixels behind it
const BLOCKS_Y = 1300; // block composition, lower right
const CELL = 40;
const COLS = 34; // field overflows the frame so drift and push-in never show an edge
const ROWS = 56;
const SEED = "laptops-sorted";

// Timeline (frames)
const DRIFT = [s(3), s(13)];
const BEAM = [s(7), s(10)]; // head travels top to bottom
const SPREAD = s(3) / (W / 2); // frames per px away from the centre line
const PUSH = [s(13), s(17)];
const DISSOLVE = s(17);
const END_CARD = s(17.8);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

type Px = {
  x: number; // lattice position in field space
  y: number;
  base: number; // dim brightness before the lattice
  period: number; // flicker step length, so pixels flicker out of rhythm
  failsAt: number | null; // fades to dark in act 2
  blinksAt: number | null; // blinks out early in act 1
  jx: number;
  jy: number;
  rot: number;
  size: number;
  act: number; // frame the beam/lattice reaches it
  dissolveAt: number;
  vx: number;
  vy: number;
};

const buildField = (): Px[] => {
  const ox = (W - COLS * CELL) / 2 + CELL / 2;
  const oy = (H - ROWS * CELL) / 2 + CELL / 2;
  const settledDrift = -70;
  const out: Px[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const k = `${SEED}-${c}-${r}`;
      const x = ox + c * CELL;
      const y = oy + r * CELL;
      const rf = random(`${k}-fail`);
      const screenX = x + settledDrift;
      const beamAt = interpolate(Math.max(0, Math.min(H, y)), [0, H], BEAM);
      out.push({
        x,
        y,
        base: 0.18 + random(`${k}-b`) * 0.4,
        period: 3 + Math.floor(random(`${k}-p`) * 8),
        failsAt: rf < 0.38 ? s(3) + random(`${k}-ft`) * s(2.6) : null,
        blinksAt: rf > 0.95 ? s(0.6) + random(`${k}-bt`) * s(2.2) : null,
        jx: (random(`${k}-jx`) - 0.5) * 16,
        jy: (random(`${k}-jy`) - 0.5) * 16,
        rot: (random(`${k}-rot`) - 0.5) * 30,
        size: 6 + random(`${k}-sz`) * 9,
        act: beamAt + Math.abs(screenX - W / 2) * SPREAD,
        dissolveAt: DISSOLVE + random(`${k}-d`) * s(0.9),
        vx: (random(`${k}-vx`) - 0.5) * 3,
        vy: -1 - random(`${k}-vy`) * 3.5,
      });
    }
  }
  return out;
};

const FIELD = buildField();

export const LaptopsSorted: React.FC = () => {
  const frame = useCurrentFrame();

  // Camera: locked off, slow lateral drift, then a slow push-in. No shake.
  const drift = interpolate(frame, DRIFT, [0, -90], { ...clamp, easing: Easing.inOut(Easing.sin) });
  const zoom = interpolate(frame, PUSH, [1, 1.1], { ...clamp, easing: Easing.inOut(Easing.sin) });

  // Pixels behind the text dim; in 13–17 s the lower-middle falls to deep navy.
  const textDim = interpolate(frame, [PUSH[0], PUSH[0] + s(1.2)], [0.86, 0.985], clamp);

  const rects = FIELD.map((p, i) => {
    const sx = (p.x + drift - W / 2) * zoom + W / 2;
    const sy = (p.y - H / 2) * zoom + H / 2;
    if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) return null;

    const lit = spring({ frame: frame - p.act, fps: LAPTOPS_SORTED.fps, config: { damping: 18, stiffness: 140 } });
    let alpha: number;
    if (frame < p.act) {
      const flicker = 0.45 + 0.55 * random(`${SEED}-f-${i}-${Math.floor((frame + i) / p.period)}`);
      alpha = p.base * flicker;
      if (p.blinksAt !== null && frame >= p.blinksAt) alpha = 0;
      if (p.failsAt !== null) alpha *= interpolate(frame, [p.failsAt, p.failsAt + s(0.8)], [1, 0], clamp);
    } else {
      alpha = interpolate(lit, [0, 1], [0.2, 0.95]);
    }

    const size = interpolate(lit, [0, 1], [p.size, 12]);
    const ox = interpolate(lit, [0, 1], [p.jx, 0]);
    const oy = interpolate(lit, [0, 1], [p.jy, 0]);
    const rot = interpolate(lit, [0, 1], [p.rot, 0]);
    // A short ivory flash as the beam's wake reaches the pixel, then steady sky blue.
    const flash = frame >= p.act ? interpolate(frame - p.act, [0, s(0.5)], [1, 0], clamp) : 0;
    const fill = frame < p.act ? C.mutedDark : flash > 0.4 ? C.skyLight : C.sky;

    const wide = interpolate(frame, [PUSH[0], PUSH[0] + s(1.2)], [0, 1], clamp);
    // Text zone: a wide band behind the left-aligned headline.
    const dx = (sx - W / 2) / 700;
    const dy = (sy - TEXT_Y) / interpolate(wide, [0, 1], [260, 330]);
    // From 13 s the lower-middle also falls to deep navy, under the block composition.
    const lx = (sx - W * 0.62) / 420;
    const ly = (sy - BLOCKS_Y) / 300;
    const dim = (1 - textDim * Math.exp(-(dx * dx + dy * dy))) * (1 - 0.9 * wide * Math.exp(-(lx * lx + ly * ly)));

    // Dissolve into fine dust that drifts up and away.
    const dt = frame - p.dissolveAt;
    const dust = dt > 0 ? Math.min(1, dt / s(1.4)) : 0;
    const dustSize = interpolate(dust, [0, 0.35, 1], [size, 3, 2], clamp);
    const dustAlpha = interpolate(dust, [0, 0.4, 1], [1, 0.8, 0], clamp);
    const px = sx + ox * zoom + (dt > 0 ? p.vx * dt : 0);
    const py = sy + oy * zoom + (dt > 0 ? p.vy * dt - 0.02 * dt * dt : 0);
    const sz = dustSize * zoom;

    const a = alpha * dim * dustAlpha;
    if (a < 0.01) return null;
    return (
      <rect
        key={i}
        x={px - sz / 2}
        y={py - sz / 2}
        width={sz}
        height={sz}
        fill={fill}
        opacity={a}
        transform={rot ? `rotate(${rot} ${px} ${py})` : undefined}
      />
    );
  });

  // Beam: thin ivory core with a blue glow (gradient on blue only), descending the centre line.
  const headY = interpolate(frame, BEAM, [-60, H + 60], clamp);
  const beamAlpha = interpolate(frame, [BEAM[0], BEAM[0] + s(0.3), BEAM[1], BEAM[1] + s(1.2)], [0, 1, 1, 0], clamp);

  const fade = (from: number, to: number, len = s(0.6)) =>
    interpolate(frame, [from, from + len, to - len, to], [0, 1, 1, 0], clamp);
  const chromeOut = interpolate(frame, [DISSOLVE, DISSOLVE + s(0.6)], [1, 0], clamp);
  const endIn = interpolate(frame, [END_CARD, END_CARD + s(0.8)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const ctaIn = interpolate(frame, [END_CARD + s(0.4), END_CARD + s(1.2)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });

  const headlineSize = 168;
  const headlineIn = interpolate(frame, [s(13.6), s(14.6)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const subIn = interpolate(frame, [s(14.4), s(15.4)], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const headlineOut = interpolate(frame, [DISSOLVE - s(0.2), DISSOLVE + s(0.5)], [1, 0], clamp);

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* Soft blue light from the top (the only gradient, and it's on blue) */}
      <AbsoluteFill style={{ background: `radial-gradient(120% 60% at 50% 0%, ${C.blue} 0%, transparent 70%)`, opacity: 0.35 }} />

      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }} shapeRendering="crispEdges">
        <defs>
          <filter id="px-glow" x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation="5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <linearGradient id="beam" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.blue} stopOpacity="0" />
            <stop offset="0.85" stopColor={C.sky} />
            <stop offset="1" stopColor={C.skyLight} />
          </linearGradient>
        </defs>
        <g filter="url(#px-glow)">{rects}</g>
        <mask id="beam-mask">
          <rect width={W} height={H} fill="#fff" />
          <rect x={0} y={TEXT_TOP - 40} width={W} height={480} fill="#262626" />
        </mask>
        <g opacity={beamAlpha} mask="url(#beam-mask)">
          <rect x={W / 2 - 14} y={0} width={28} height={Math.max(0, headY)} fill="url(#beam)" opacity={0.35} filter="url(#px-glow)" />
          <rect x={W / 2 - 1.5} y={0} width={3} height={Math.max(0, headY)} fill="url(#beam)" />
          <rect x={W / 2 - 4} y={headY - 40} width={8} height={40} fill={C.skyLight} filter="url(#px-glow)" />
        </g>
      </svg>

      <Grain frame={frame} />

      {/* Persistent Story chrome, inside the safe zone. One logo on screen at a time. */}
      <Wordmark width={150} opacity={chromeOut * (1 - endIn)} style={{ position: "absolute", left: SIDE, top: SAFE }} />
      <div style={{ position: "absolute", left: SIDE, top: SAFE + 150, display: "flex", opacity: chromeOut }}>
        <Badge text={COPY.label} size={26} />
      </div>
      <LineArrow
        width={110}
        color={C.ivory}
        progress={interpolate(frame, [s(0.3), s(1.3)], [0, 1], clamp) * chromeOut}
        style={{ position: "absolute", left: SIDE, top: H - SAFE - 90 }}
      />

      {/* Headlines, left-aligned, sentence case */}
      {COPY.captions.map((c) => (
        <TextBlock key={c.lines.join(" ")}>
          <StoryHeadline lines={c.lines} size={108} color={C.ivory} endDot={c.dot} progress={fade(c.from, c.to)} />
        </TextBlock>
      ))}

      <TextBlock>
        <StoryHeadline
          lines={COPY.headline.lines}
          accent={{ text: COPY.headline.accent, color: C.lime }}
          size={headlineSize}
          color={C.ivory}
          progress={headlineIn * headlineOut}
        />
        <div style={{ marginTop: 40, fontFamily: F.sans, fontSize: 44, color: C.ivory, opacity: subIn * headlineOut }}>
          {COPY.sub}
        </div>
      </TextBlock>

      {/* Block composition, lower right, steps in with the headline */}
      <div style={{ position: "absolute", right: SIDE + 40, top: BLOCKS_Y - 180, opacity: headlineOut }}>
        <BlockStack unit={190} frame={frame - s(14)} ground="ink" />
      </div>

      {/* End card */}
      <AbsoluteFill style={{ opacity: endIn, background: C.ink }}>
        <AbsoluteFill
          style={{ background: `radial-gradient(90% 55% at 50% 30%, ${C.blue} 0%, ${C.deepBlue} 45%, transparent 85%)`, opacity: 0.45 }}
        />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: 72, paddingBottom: 120 }}>
          <Img src={staticFile(LOGO_FILE)} style={{ width: 520, height: 520 / LOGO_RATIO }} />
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 26, opacity: ctaIn }}>
            <div
              style={{
                fontFamily: F.sans,
                fontWeight: 600,
                fontSize: 44,
                color: C.ink,
                background: C.lime,
                padding: "24px 64px",
                borderRadius: 999,
              }}
            >
              {COPY.cta}
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 30, color: C.mutedDark }}>{COPY.url}</div>
          </div>
        </AbsoluteFill>
        <LineArrow width={110} color={C.ivory} progress={ctaIn} style={{ position: "absolute", left: SIDE, top: H - SAFE - 90 }} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// Left-aligned text block under the badge, with side margins so it never touches the right edge.
const TextBlock: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: SIDE, right: SIDE, top: TEXT_TOP, display: "flex", flexDirection: "column" }}>
    {children}
  </div>
);

// Subtle film grain in ivory, re-seeded every frame.
const Grain: React.FC<{ frame: number }> = ({ frame }) => (
  <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.07, mixBlendMode: "screen" }}>
    <filter id="grain">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 97} />
      <feColorMatrix type="matrix" values="0 0 0 0 0.961  0 0 0 0 0.957  0 0 0 0 0.937  1 0 0 0 -0.35" />
    </filter>
    <rect width={W} height={H} filter="url(#grain)" />
  </svg>
);
