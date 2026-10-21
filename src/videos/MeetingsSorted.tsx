import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { WORDMARK_RATIO } from "../ui/Story";
import { F } from "../ui/theme";

// "Meetings, sorted." — corporate-humour story, 20 s, 9x16, 24 fps, with voiceover.
// Fixed copy from Henrique's brief (21 Oct 2026). Five flat story cards:
// the meeting moved -> you still need the charts -> Ask Copilot Chat (the drop) -> Meetings, sorted. -> CTA.
// The three dashed bars drawn in card 2 are the same bars that fill in card 3.
// Grid: 120 BPM, 1 beat = 12 frames, 1 bar = 48 frames; animations start on 6-frame (0.25 s) steps.
// Music: scripts/make-meetings-music.py (drop on 0:08, resolve on 0:18).
// Voiceover lines are placed by scripts/mix-meetings-voiceover.py at the same times used below.

export const MEETINGS_SORTED = { fps: 24, durationInFrames: 480, width: 1080, height: 1920 } as const;

// The only four colours in this video.
const INK = "#101B32";
const BLUE = "#1644B8";
const LIME = "#E8FF58";
const IVORY = "#F5F4EF";
const BLUE_TO_INK = (deg: number) => `linear-gradient(${deg}deg, ${BLUE} 0%, ${INK} 100%)`;

const W = 1080;
const H = 1920;
const BEAT = 12;
const STEP = 6; // 0.25 s
const SIDE = 80;
const TOP = 250; // Story safe zone; the wordmark sits on it
const TEXT_TOP = 560;
const TEXT_W = W - 2 * SIDE - 60; // keeps type off the right edge
// No text below 80% of the height (1536 px).

// Card changes, on bar downbeats: 0:00, 0:04, 0:08, 0:14, 0:18, end 0:20.
const DOWNBEATS = [0, 96, 192, 336, 432, 480];
// Music + voiceover, mixed by scripts/mix-meetings-voiceover.py.
const MIX = "audio/Alert Global Tech - Meetings Sorted Mix.wav";
const WORDMARK_INK = "brand/alert-global-tech-wordmark-ink.png";
const WORDMARK_IVORY = "brand/alert-global-tech-wordmark-ivory.png";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

// 0 → 1 over one 0.25 s step starting at local frame `at`.
const step = (f: number, at: number, len = STEP) => interpolate(f, [at, at + len], [0, 1], { ...clamp, easing: easeOut });

export const MeetingsSorted: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [Card1, Card2, Card3, Card4, Card5];
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Audio src={staticFile(MIX)} />
      {cards.map((CardBody, i) => {
        const start = DOWNBEATS[i];
        const next = DOWNBEATS[i + 1];
        const f = frame - start;
        // Slide-up wipe: the card rises over the last 0.25 s before its downbeat and lands on it.
        if (frame < start - (i === 0 ? 0 : STEP) || frame >= next) return null;
        const y = i === 0 ? 0 : interpolate(f, [-STEP, 0], [H, 0], { ...clamp, easing: Easing.out(Easing.quad) });
        return (
          <AbsoluteFill key={i} style={{ transform: `translateY(${y}px)` }}>
            <CardBody f={f} />
          </AbsoluteFill>
        );
      })}
    </AbsoluteFill>
  );
};

type CardProps = { f: number };

// ---------- Card system ----------

const Frame: React.FC<{ ground: "ivory" | "ink"; children: React.ReactNode; wordmark?: boolean }> = ({
  ground,
  children,
  wordmark = true,
}) => (
  <AbsoluteFill style={{ background: ground === "ivory" ? IVORY : INK, overflow: "hidden" }}>
    {children}
    {wordmark ? (
      <Img
        src={staticFile(ground === "ivory" ? WORDMARK_INK : WORDMARK_IVORY)}
        style={{ position: "absolute", left: SIDE, top: TOP, width: 170, height: 170 / WORDMARK_RATIO }}
      />
    ) : null}
    <Arrow color={ground === "ivory" ? INK : IVORY} width={96} style={{ position: "absolute", left: SIDE, top: H - TOP - 40 }} />
  </AbsoluteFill>
);

// Thin "→", drawn as a shape so no font outside the brand set can be pulled in for the glyph.
const Arrow: React.FC<{ color: string; width: number; stroke?: number; style?: React.CSSProperties }> = ({
  color,
  width,
  stroke = 3,
  style,
}) => {
  const h = width * 0.36;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={style}>
      <line x1={stroke} y1={h / 2} x2={width - stroke} y2={h / 2} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      <polyline
        points={`${width - h * 0.5},${stroke} ${width - stroke},${h / 2} ${width - h * 0.5},${h - stroke}`}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

const Headline: React.FC<{ color: string; size?: number; p: number; children: React.ReactNode }> = ({
  color,
  size = 130,
  p,
  children,
}) => (
  <div
    style={{
      fontFamily: F.sans,
      fontWeight: 700,
      fontSize: size,
      lineHeight: 1.0,
      letterSpacing: "-0.035em",
      color,
      maxWidth: TEXT_W,
      opacity: p,
      transform: `translateY(${(1 - p) * 40}px)`,
    }}
  >
    {children}
  </div>
);

const Caption: React.FC<{ color: string; p: number; children: React.ReactNode }> = ({ color, p, children }) => (
  <div
    style={{
      fontFamily: F.sans,
      fontWeight: 400,
      fontSize: 46,
      lineHeight: 1.3,
      color,
      marginTop: 44,
      maxWidth: TEXT_W,
      opacity: p,
      transform: `translateY(${(1 - p) * 24}px)`,
    }}
  >
    {children}
  </div>
);

const Pill: React.FC<{ text: string; p: number }> = ({ text, p }) => (
  <div
    style={{
      alignSelf: "flex-start",
      fontFamily: F.statement, // Archivo Narrow
      fontWeight: 600,
      fontSize: 32,
      letterSpacing: "0.08em",
      textTransform: "uppercase",
      color: IVORY,
      background: BLUE,
      borderRadius: 999,
      padding: "14px 30px 12px",
      marginBottom: 48,
      opacity: p,
      transform: `scale(${0.85 + 0.15 * p})`,
      transformOrigin: "left center",
    }}
  >
    {text}
  </div>
);

const TextColumn: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ position: "absolute", left: SIDE, top: TEXT_TOP, display: "flex", flexDirection: "column" }}>{children}</div>
);

// A flat square that pops in (scale from its corner) on a step.
const Square: React.FC<{ x: number; y: number; size: number; fill: string; p: number; style?: React.CSSProperties }> = ({
  x,
  y,
  size,
  fill,
  p,
  style,
}) =>
  p <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: size,
        height: size,
        background: fill,
        transform: `scale(${p})`,
        transformOrigin: "bottom left",
        ...style,
      }}
    />
  );

// ---------- The bar chart shared by cards 2 and 3 ----------

const BASE_Y = 1480;
const BAR_W = 110;
const BARS = [
  { x: 590, h: 200, fill: BLUE },
  { x: 740, h: 300, fill: LIME },
  { x: 890, h: 420, fill: BLUE },
];

const Baseline: React.FC<{ p: number }> = ({ p }) => (
  <div style={{ position: "absolute", left: 550, top: BASE_Y, width: 470 * p, height: 4, background: IVORY }} />
);

// Dashed outline (left side up, across the top, right side down), revealed along its length.
const DashedBar: React.FC<{ i: number; p: number }> = ({ i, p }) => {
  if (p <= 0) return null;
  const { x, h } = BARS[i];
  const y = BASE_Y - h;
  const sides = [
    [x, BASE_Y, x, y, h],
    [x, y, x + BAR_W, y, BAR_W],
    [x + BAR_W, y, x + BAR_W, BASE_Y, h],
  ] as const;
  let left = p * (2 * h + BAR_W);
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {sides.map(([x1, y1, x2, y2, len], k) => {
        const q = Math.max(0, Math.min(1, left / len));
        left -= len;
        return q > 0 ? (
          <line key={k} x1={x1} y1={y1} x2={x1 + (x2 - x1) * q} y2={y1 + (y2 - y1) * q} stroke={LIME} strokeWidth={5} strokeDasharray="18 12" />
        ) : null;
      })}
    </svg>
  );
};

// Solid fill rising from the baseline into the dashed outline.
const FilledBar: React.FC<{ i: number; p: number }> = ({ i, p }) => {
  if (p <= 0) return null;
  const { x, h, fill } = BARS[i];
  return <div style={{ position: "absolute", left: x, top: BASE_Y - h * p, width: BAR_W, height: h * p, background: fill }} />;
};

// Thin "↗", drawn as a shape.
const UpRight: React.FC<{ size: number; color: string; style?: React.CSSProperties }> = ({ size, color, style }) => {
  const s = 9;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={style}>
      <line x1={s} y1={size - s} x2={size - s} y2={s} stroke={color} strokeWidth={s} strokeLinecap="round" />
      <polyline points={`${size * 0.38},${s} ${size - s},${s} ${size - s},${size * 0.62}`} fill="none" stroke={color} strokeWidth={s} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

// ---------- Cards ----------

// Quick nervous shake on beats 3 and 4 of each bar: alternating jolts for one 0.25 s step.
const shake = (f: number) => {
  const inBar = f % (4 * BEAT);
  const on = (inBar >= 2 * BEAT && inBar < 2 * BEAT + STEP) || (inBar >= 3 * BEAT && inBar < 3 * BEAT + STEP);
  if (!on) return { dx: 0, rot: 0 };
  const k = inBar % BEAT; // 0..5
  const dir = k % 2 === 0 ? 1 : -1;
  const amp = 1 - k / STEP;
  return { dx: dir * 14 * amp, rot: dir * 3 * amp };
};

// 0:00–0:04 · Ivory
const Card1: React.FC<CardProps> = ({ f }) => {
  const a = shake(f);
  const b = shake(f + 2); // slightly out of phase, so the two squares jostle each other
  return (
    <Frame ground="ivory">
      <TextColumn>
        <Pill text="Corporate life, unfiltered" p={step(f, STEP)} />
        <Headline color={INK} size={128} p={step(f, 2 * STEP)}>
          The meeting just moved to tomorrow<span style={{ color: BLUE }}>.</span>
        </Headline>
      </TextColumn>
      <Square x={690} y={1170} size={210} fill={LIME} p={step(f, BEAT + STEP)} style={{ translate: `${a.dx}px 0`, rotate: `${a.rot}deg` }} />
      <Square x={790} y={1270} size={210} fill={BLUE} p={step(f, 2 * BEAT)} style={{ translate: `${-b.dx}px 0`, rotate: `${-b.rot}deg` }} />
    </Frame>
  );
};

// 0:04–0:08 · Ink · the empty charts draw in, one per beat, rising left to right.
const Card2: React.FC<CardProps> = ({ f }) => (
  <Frame ground="ink">
    <TextColumn>
      <Headline color={IVORY} size={128} p={step(f, STEP)}>
        You still need the charts<span style={{ color: LIME }}>.</span>
      </Headline>
    </TextColumn>
    <Baseline p={step(f, BEAT)} />
    {BARS.map((_, i) => (
      <DashedBar key={i} i={i} p={step(f, (2 + i) * BEAT, BEAT)} />
    ))}
  </Frame>
);

// 0:08–0:14 · Ink + rising blue beam · the drop. Bars fill at 0:10.5, 0:11, 0:11.5; the arrow pops on 0:12.
const FILL_AT = [60, 72, 84];
const ARROW_AT = 96;
const Card3: React.FC<CardProps> = ({ f }) => {
  const beam = step(f, 0, 2 * STEP);
  const pop = interpolate(f, [ARROW_AT, ARROW_AT + STEP / 2, ARROW_AT + STEP], [0, 1.25, 1], clamp);
  const tall = BARS[2];
  return (
    <Frame ground="ink">
      {/* Diagonal beam, bottom-left to top-right: Electric Blue fading to Deep Ink */}
      <div
        style={{
          position: "absolute",
          left: W / 2 - 1400,
          top: H / 2 - 170,
          width: 2800,
          height: 340,
          background: BLUE_TO_INK(90),
          transform: `rotate(-60.6deg) translateY(${(1 - beam) * 900}px)`,
          opacity: beam,
        }}
      />
      <TextColumn>
        <Headline color={IVORY} size={136} p={step(f, STEP)}>
          Ask Copilot Chat<span style={{ color: LIME }}>.</span>
        </Headline>
        <Caption color={IVORY} p={step(f, 3 * BEAT + STEP)}>
          Your data, presentation-ready.
        </Caption>
      </TextColumn>
      <Baseline p={1} />
      {BARS.map((_, i) => {
        const fill = step(f, FILL_AT[i]);
        return (
          <div key={i}>
            {fill < 1 ? <DashedBar i={i} p={1} /> : null}
            <FilledBar i={i} p={fill} />
          </div>
        );
      })}
      {pop > 0 ? (
        <UpRight
          size={96}
          color={LIME}
          style={{
            position: "absolute",
            left: tall.x + (BAR_W - 96) / 2,
            top: BASE_Y - tall.h - 96 - 36,
            transform: `scale(${pop})`,
            transformOrigin: "bottom left",
          }}
        />
      ) : null}
    </Frame>
  );
};

// 0:14–0:18 · Ivory · the payoff.
const Card4: React.FC<CardProps> = ({ f }) => (
  <Frame ground="ivory">
    <TextColumn>
      <Headline color={INK} size={150} p={step(f, STEP)}>
        Meetings,
      </Headline>
      <div
        style={{
          fontFamily: F.accent, // Instrument Serif Italic
          fontStyle: "italic",
          fontSize: 200,
          lineHeight: 0.95,
          color: BLUE,
          opacity: step(f, BEAT + STEP),
          transform: `translateY(${(1 - step(f, BEAT + STEP)) * 40}px)`,
        }}
      >
        sorted.
      </div>
      <Caption color={INK} p={step(f, 3 * BEAT)}>
        Microsoft 365 and Copilot,
        <br />
        set up by Alert.
      </Caption>
    </TextColumn>
    <Square x={660} y={1170} size={230} fill={BLUE_TO_INK(160)} p={step(f, 2 * BEAT)} />
    <Square x={780} y={1090} size={190} fill={LIME} p={step(f, 2 * BEAT + STEP)} />
  </Frame>
);

// 0:18–0:20 · Ink · end card: lockup and CTA; the blue dot pulses on the final beat (0:19.5).
const Card5: React.FC<CardProps> = ({ f }) => {
  const logoW = 560;
  const logoH = logoW / LOGO_RATIO;
  const logo = step(f, 0);
  const pulse = interpolate(f, [3 * BEAT, 3 * BEAT + STEP / 2, 3 * BEAT + STEP], [1, 1.8, 1], clamp);
  return (
    <Frame ground="ink" wordmark={false}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 120 }}>
        <Img
          src={staticFile(LOGO_FILE)}
          style={{ width: logoW, height: logoH, display: "block", opacity: logo, transform: `scale(${0.94 + 0.06 * logo})` }}
        />
        <div
          style={{
            marginTop: 90,
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontFamily: F.sans,
            fontWeight: 700,
            fontSize: 46,
            color: INK,
            background: LIME,
            borderRadius: 999,
            padding: "26px 54px",
            opacity: step(f, STEP),
            transform: `translateY(${(1 - step(f, STEP)) * 24}px)`,
          }}
        >
          Request a Quote
          <Arrow color={INK} width={52} stroke={4} />
        </div>
        <div
          style={{
            marginTop: 36,
            display: "flex",
            alignItems: "center",
            gap: 14,
            fontFamily: F.sans,
            fontWeight: 400,
            fontSize: 34,
            color: IVORY,
            opacity: step(f, 2 * STEP),
          }}
        >
          alertglobaltech.com
          <div style={{ width: 16, height: 16, borderRadius: "50%", background: BLUE, transform: `scale(${pulse})` }} />
        </div>
      </AbsoluteFill>
    </Frame>
  );
};
