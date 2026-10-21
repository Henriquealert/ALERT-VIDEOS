import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { WORDMARK_RATIO } from "../ui/Story";
import { F } from "../ui/theme";

// "Tech updates for you" — Windows 11 Pro for Business. 30 s, 9x16, 24 fps.
// Source: partner_content row 97022741-9b72-4593-ba1f-1da6089b2e14 (eBook | Gated,
// "Windows Means Business" / "The New Mandate for IT"). Every line comes from that row.
// Gated, so the CTA points to the eBook.
// Story: the opener -> the pressure on IT -> Windows 11 Pro answers it point by point ->
// innovation and protection balanced -> get the eBook. One block tower carries the story
// across the cards: a foundation in card 1, gaps and askew blocks in card 2, each point
// fills a slot in card 3, the finished tower in card 4, a small one on the end card.
// Grid: 120 BPM, 1 beat = 12 frames; animations start on 6-frame (0.25 s) steps.
// Voiceover lines are placed by scripts/mix-story-voiceover.py at the same times used below.

export const TECH_UPDATES_WIN11 = { fps: 24, durationInFrames: 720, width: 1080, height: 1920 } as const;

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
const TOP = 250; // Story safe zone; text also stays above the bottom 20% (y < 1536)
const TEXT_TOP = 560;
const TEXT_W = W - 2 * SIDE - 60; // keeps type off the right edge

// Card changes, on bar downbeats: 0:00, 0:04, 0:10, 0:20, 0:26, end 0:30.
const DOWNBEATS = [0, 96, 240, 480, 624, 720];
// Music + voiceover, mixed by scripts/mix-story-voiceover.py.
const MIX = "audio/Alert Global Tech - Tech Updates Windows 11 Mix.wav";
const WORDMARK_INK = "brand/alert-global-tech-wordmark-ink.png";
const WORDMARK_IVORY = "brand/alert-global-tech-wordmark-ivory.png";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

// 0 → 1 over one 0.25 s step starting at local frame `at`.
const step = (f: number, at: number, len = STEP) => interpolate(f, [at, at + len], [0, 1], { ...clamp, easing: easeOut });

export const TechUpdatesWindows11: React.FC = () => {
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
}) => {
  const fg = ground === "ivory" ? INK : IVORY;
  return (
    <AbsoluteFill style={{ background: ground === "ivory" ? IVORY : INK, overflow: "hidden" }}>
      {children}
      {wordmark ? (
        <Img
          src={staticFile(ground === "ivory" ? WORDMARK_INK : WORDMARK_IVORY)}
          style={{ position: "absolute", left: SIDE, top: TOP, width: 170, height: 170 / WORDMARK_RATIO }}
        />
      ) : null}
      <Arrow color={fg} width={96} style={{ position: "absolute", left: SIDE, top: H - TOP - 40 }} />
    </AbsoluteFill>
  );
};

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
  size = 116,
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
      marginTop: 40,
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
      marginBottom: 44,
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
const Block: React.FC<{ x: number; y: number; size: number; fill: string; p: number; origin?: string }> = ({
  x,
  y,
  size,
  fill,
  p,
  origin = "bottom left",
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
        transformOrigin: origin,
      }}
    />
  );

// ---------- The tower that runs through the video ----------

const T = { size: 140, x0: 580, baseY: 1600 };
type Slot = { c: number; r: number; fill: string };
const slotPos = (s: { c: number; r: number }) => ({ x: T.x0 + s.c * T.size, y: T.baseY - (s.r + 1) * T.size });
const FOUNDATION: Slot = { c: 0, r: 0, fill: LIME };
const BASE: Slot[] = [
  { c: 1, r: 0, fill: BLUE },
  { c: 2, r: 0, fill: BLUE_TO_INK(180) },
];
const MANDATES: Slot[] = [
  { c: 1, r: 1, fill: LIME }, // advanced built-in security
  { c: 2, r: 1, fill: BLUE }, // simplified hybrid device management
  { c: 2, r: 2, fill: LIME }, // faster AI-driven workflows
];
// How the base blocks sit while IT is under pressure (card 2): shifted and tilted.
const ASKEW = [
  { dx: -26, dy: -60, rot: -9 },
  { dx: 34, dy: -130, rot: 11 },
];

const TowerBlock: React.FC<{ slot: Slot; p: number; dx?: number; dy?: number; rot?: number }> = ({ slot, p, dx = 0, dy = 0, rot = 0 }) => {
  if (p <= 0) return null;
  const { x, y } = slotPos(slot);
  return (
    <div
      style={{
        position: "absolute",
        left: x + dx,
        top: y + dy,
        width: T.size,
        height: T.size,
        background: slot.fill,
        opacity: p,
        transform: `rotate(${rot}deg) scale(${0.6 + 0.4 * p})`,
        transformOrigin: "bottom left",
      }}
    />
  );
};

// Dashed outline drawn by revealing a dashed path along its length.
const DashedOutline: React.FC<{ slot: Slot; p: number }> = ({ slot, p }) => {
  if (p <= 0) return null;
  const { x, y } = slotPos(slot);
  const s = T.size;
  const sides = [
    [x, y, x + s, y],
    [x + s, y, x + s, y + s],
    [x + s, y + s, x, y + s],
    [x, y + s, x, y],
  ];
  const k = p * 4;
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
      {sides.map(([x1, y1, x2, y2], i) => {
        const q = Math.max(0, Math.min(1, k - i));
        return q > 0 ? (
          <line key={i} x1={x1} y1={y1} x2={x1 + (x2 - x1) * q} y2={y1 + (y2 - y1) * q} stroke={LIME} strokeWidth={5} strokeDasharray="20 13" />
        ) : null;
      })}
    </svg>
  );
};

// ---------- Cards ----------

// 0:00–0:04 · Ivory · opener. VO: "Tech updates for you." 0.25 · "Windows 11 Pro for business." 2.0
const Card1: React.FC<CardProps> = ({ f }) => (
  <Frame ground="ivory">
    <TextColumn>
      <Headline color={INK} size={150} p={step(f, STEP)}>
        Tech updates
      </Headline>
      <div
        style={{
          fontFamily: F.accent, // Instrument Serif Italic
          fontStyle: "italic",
          fontSize: 190,
          lineHeight: 0.95,
          color: BLUE,
          marginBottom: 56,
          opacity: step(f, 2 * BEAT),
          transform: `translateY(${(1 - step(f, 2 * BEAT)) * 40}px)`,
        }}
      >
        for you.
      </div>
      <Pill text="Windows 11 Pro for Business" p={step(f, 4 * BEAT)} />
    </TextColumn>
    {/* The foundation block lands on beat 3 of bar 2 */}
    <TowerBlock slot={FOUNDATION} p={step(f, 6 * BEAT)} />
  </Frame>
);

// 0:04–0:10 · Ink · the pressure. VO: "You're expected to balance..." 4.5 · "It can be hard to keep up." 8.5
const Card2: React.FC<CardProps> = ({ f }) => (
  <Frame ground="ink">
    <TextColumn>
      <Headline color={IVORY} size={100} p={step(f, STEP)}>
        You're expected to balance AI, security and productivity<span style={{ color: LIME }}>.</span>
      </Headline>
      <Caption color={IVORY} p={step(f, 108)}>
        It can be hard to keep up.
      </Caption>
    </TextColumn>
    <TowerBlock slot={FOUNDATION} p={1} />
    {BASE.map((s, i) => (
      <TowerBlock key={i} slot={s} p={step(f, (2 + i) * BEAT)} {...ASKEW[i]} />
    ))}
    {/* The gaps where the rest of the tower should be */}
    {MANDATES.map((s, i) => (
      <DashedOutline key={i} slot={s} p={step(f, 108 + i * STEP, 2 * STEP)} />
    ))}
  </Frame>
);

// 0:10–0:20 · Ink + rising blue beam · the answer, one point per slot.
// VO: "...helps you meet new IT mandates." 10.0 · points at 13.5, 15.5, 17.75
const POINTS = ["Advanced built-in security", "Simplified hybrid device management", "Faster AI-driven workflows"];
const POINT_AT = [84, 132, 186]; // local frames for 13.5, 15.5, 17.75 s
const Card3: React.FC<CardProps> = ({ f }) => {
  const beam = step(f, 0, 2 * STEP);
  const straighten = step(f, 0, 2 * STEP);
  return (
    <Frame ground="ink">
      <div
        style={{
          position: "absolute",
          left: -600,
          top: H / 2 - 260,
          width: 2600,
          height: 520,
          background: `linear-gradient(90deg, ${BLUE} 0%, ${BLUE} 25%, ${INK} 100%)`,
          transform: `translateY(${(1 - beam) * 900}px) rotate(-58deg)`,
          opacity: beam * 0.9,
        }}
      />
      <TextColumn>
        <Headline color={IVORY} size={96} p={step(f, STEP)}>
          Windows 11 Pro helps you meet new IT mandates<span style={{ color: LIME }}>.</span>
        </Headline>
        <div style={{ marginTop: 48, display: "flex", flexDirection: "column", gap: 26 }}>
          {POINTS.map((t, i) => {
            const p = step(f, POINT_AT[i]);
            return (
              <div
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 22,
                  opacity: p,
                  transform: `translateX(${(1 - p) * -24}px)`,
                  fontFamily: F.sans,
                  fontWeight: 400,
                  fontSize: 44,
                  color: IVORY,
                }}
              >
                <span style={{ width: 22, height: 22, background: MANDATES[i].fill === LIME ? LIME : IVORY, flexShrink: 0 }} />
                {t}
              </div>
            );
          })}
        </div>
      </TextColumn>
      <TowerBlock slot={FOUNDATION} p={1} />
      {BASE.map((s, i) => (
        <TowerBlock
          key={i}
          slot={s}
          p={1}
          dx={ASKEW[i].dx * (1 - straighten)}
          dy={ASKEW[i].dy * (1 - straighten)}
          rot={ASKEW[i].rot * (1 - straighten)}
        />
      ))}
      {MANDATES.map((s, i) => {
        const fill = step(f, POINT_AT[i]);
        return (
          <div key={i}>
            {fill < 1 ? <DashedOutline slot={s} p={1} /> : null}
            <TowerBlock slot={s} p={fill} dy={(1 - fill) * -60} />
          </div>
        );
      })}
    </Frame>
  );
};

// 0:20–0:26 · Ivory · the payoff. VO: "Innovation and protection, balanced." 20.25 · "Stay secure..." 22.75
const Card4: React.FC<CardProps> = ({ f }) => (
  <Frame ground="ivory">
    <TextColumn>
      <Headline color={INK} size={120} p={step(f, STEP)}>
        Innovation and protection,
      </Headline>
      <div
        style={{
          fontFamily: F.accent,
          fontStyle: "italic",
          fontSize: 180,
          lineHeight: 0.95,
          color: BLUE,
          opacity: step(f, 48),
          transform: `translateY(${(1 - step(f, 48)) * 40}px)`,
        }}
      >
        balanced.
      </div>
      <Caption color={INK} p={step(f, 66)}>
        Stay secure, productive and prepared for the future.
      </Caption>
    </TextColumn>
    {/* The finished tower */}
    {[FOUNDATION, ...BASE, ...MANDATES].map((s, i) => (
      <TowerBlock key={i} slot={s.fill === BLUE_TO_INK(180) ? { ...s, fill: BLUE_TO_INK(200) } : s} p={1} />
    ))}
  </Frame>
);

// 0:26–0:30 · Ink · CTA to the gated eBook. VO: "Download your complimentary copy of The New Mandate for IT." 26.25
const Card5: React.FC<CardProps> = ({ f }) => {
  const logoW = 560;
  const logoH = logoW / LOGO_RATIO;
  const logo = step(f, 0);
  const pulse = interpolate(f, [7 * BEAT, 7 * BEAT + STEP, 7 * BEAT + 2 * STEP], [1, 1.7, 1], clamp); // final beat, 0:29.5
  const mini = 70;
  const tower = [FOUNDATION, ...BASE, ...MANDATES];
  return (
    <Frame ground="ink" wordmark={false}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 260 }}>
        <div style={{ position: "relative", opacity: logo, transform: `scale(${0.94 + 0.06 * logo})` }}>
          <Img src={staticFile(LOGO_FILE)} style={{ width: logoW, height: logoH, display: "block" }} />
          <div
            style={{
              position: "absolute",
              left: logoW + 18,
              top: logoH * 0.62,
              width: 28,
              height: 28,
              borderRadius: "50%",
              background: BLUE,
              transform: `scale(${pulse})`,
              opacity: step(f, STEP),
            }}
          />
        </div>
        <div style={{ marginTop: 70, fontFamily: F.sans, fontWeight: 400, fontSize: 42, color: IVORY, opacity: step(f, STEP), textAlign: "center", maxWidth: 820 }}>
          <div style={{ fontWeight: 700 }}>The New Mandate for IT</div>
          <div>a complimentary eBook</div>
        </div>
        <div
          style={{
            marginTop: 40,
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
            opacity: step(f, 2 * BEAT),
            transform: `translateY(${(1 - step(f, 2 * BEAT)) * 24}px)`,
          }}
        >
          Download the eBook
          <Arrow color={INK} width={52} stroke={4} />
        </div>
        <div style={{ marginTop: 34, fontFamily: F.sans, fontWeight: 400, fontSize: 34, color: IVORY, opacity: step(f, 2 * BEAT + STEP) }}>
          alertglobal.tech
        </div>
      </AbsoluteFill>
      {/* The same tower, small, lower right */}
      {tower.map((s, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: W - SIDE - 3 * mini + s.c * mini,
            top: 1560 - (s.r + 1) * mini,
            width: mini,
            height: mini,
            background: s.fill,
            opacity: step(f, STEP + i * 2),
          }}
        />
      ))}
    </Frame>
  );
};
