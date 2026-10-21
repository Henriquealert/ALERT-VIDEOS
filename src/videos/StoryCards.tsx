import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { WORDMARK_RATIO } from "../ui/Story";
import { F } from "../ui/theme";

// Story Cards: five flat cards, 20 s, 9x16, 24 fps, on an original 120 BPM instrumental
// (scripts/make-story-music.py). The music has no voice; a voiceover is added separately.
// Grid: 1 beat = 12 frames, 1 bar = 48 frames, every animation starts and ends on a 6-frame
// (0.25 s) step. Card changes land on the downbeats at 0:00, 0:04, 0:08, 0:14 and 0:18.

export const STORY_CARDS = { fps: 24, durationInFrames: 480, width: 1080, height: 1920 } as const;

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

const DOWNBEATS = [0, 96, 192, 336, 432, 480];
const MUSIC = "audio/Alert Global Tech - Story Cards Music.wav";
const WORDMARK_INK = "brand/alert-global-tech-wordmark-ink.png";
const WORDMARK_IVORY = "brand/alert-global-tech-wordmark-ivory.png";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);

// 0 → 1 over one 0.25 s step starting at local frame `at`.
const step = (f: number, at: number, len = STEP) => interpolate(f, [at, at + len], [0, 1], { ...clamp, easing: easeOut });

export const StoryCards: React.FC = () => {
  const frame = useCurrentFrame();
  const cards = [Card1, Card2, Card3, Card4, Card5];
  return (
    <AbsoluteFill style={{ background: INK }}>
      <Audio src={staticFile(MUSIC)} />
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

// ---------- Cards ----------

// 0:00–0:04 · Ivory · IT SECURITY pill · lime and blue squares pop on beats 3 and 4
const Card1: React.FC<CardProps> = ({ f }) => (
  <Frame ground="ivory">
    <TextColumn>
      <Pill text="IT security" p={step(f, 0)} />
      <Headline color={INK} p={step(f, STEP)}>
        Still running
        <br />
        Windows 10?
      </Headline>
    </TextColumn>
    <Block x={600} y={1150} size={220} fill={LIME} p={step(f, 2 * BEAT)} />
    <Block x={730} y={1270} size={220} fill={BLUE} p={step(f, 3 * BEAT)} />
  </Frame>
);

// 0:04–0:08 · Ink · dashed lime outline draws one side per beat where a block is missing
const Card2: React.FC<CardProps> = ({ f }) => {
  const size = 200;
  const gx = 540; // composition origin (lower right)
  const gy = 1120;
  const slot = { x: gx + size, y: gy }; // the missing block
  const sides = [
    [slot.x, slot.y, slot.x + size, slot.y],
    [slot.x + size, slot.y, slot.x + size, slot.y + size],
    [slot.x + size, slot.y + size, slot.x, slot.y + size],
    [slot.x, slot.y + size, slot.x, slot.y],
  ];
  return (
    <Frame ground="ink">
      <TextColumn>
        <Headline color={IVORY} size={108} p={step(f, 0)}>
          Free security updates ended in October 2025<span style={{ color: LIME }}>.</span>
        </Headline>
      </TextColumn>
      <Block x={gx} y={gy} size={size} fill={BLUE} p={step(f, BEAT)} />
      <Block x={gx + size} y={gy + size} size={size} fill={BLUE_TO_INK(160)} p={step(f, 2 * BEAT)} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        {sides.map(([x1, y1, x2, y2], i) => {
          const p = step(f, (3 + i) * BEAT); // beats 4, 5, 6, 7 of the card
          return p > 0 ? (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x1 + (x2 - x1) * p}
              y2={y1 + (y2 - y1) * p}
              stroke={LIME}
              strokeWidth={6}
              strokeDasharray="22 14"
            />
          ) : null;
        })}
      </svg>
    </Frame>
  );
};

// 0:08–0:14 · Ink · the drop · blue beam rises bottom-left to top-right · tower stacks one block per beat
const Card3: React.FC<CardProps> = ({ f }) => {
  const beam = step(f, 0, 2 * STEP);
  const size = 150;
  const baseY = 1480;
  const x0 = 500;
  // Stepped tower: columns of 1, 2 and 3 blocks, filled bottom-up, one block per beat.
  const slots = [
    { c: 0, r: 0, fill: LIME },
    { c: 1, r: 0, fill: BLUE },
    { c: 2, r: 0, fill: BLUE_TO_INK(180) },
    { c: 1, r: 1, fill: LIME },
    { c: 2, r: 1, fill: BLUE },
    { c: 2, r: 2, fill: LIME },
  ];
  return (
    <Frame ground="ink">
      {/* Diagonal beam: a blue-to-ink band that rises into place on the drop */}
      <div
        style={{
          position: "absolute",
          left: -600,
          top: H / 2 - 260,
          width: 2600,
          height: 520,
          background: `linear-gradient(90deg, ${BLUE} 0%, ${BLUE} 25%, ${INK} 100%)`,
          transform: `translateY(${(1 - beam) * 900}px) rotate(-58deg)`,
          transformOrigin: "50% 50%",
          opacity: beam,
        }}
      />
      <TextColumn>
        <Headline color={IVORY} size={104} p={step(f, 0)}>
          Windows 11 Pro laptops from Dell, HP and Lenovo<span style={{ color: LIME }}>.</span>
        </Headline>
        <Caption color={IVORY} p={step(f, STEP)}>
          Licensed and set up.
        </Caption>
      </TextColumn>
      {slots.map((sl, i) => {
        const p = step(f, (i + 1) * BEAT);
        return p > 0 ? (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x0 + sl.c * size,
              top: baseY - (sl.r + 1) * size - (1 - p) * 80,
              width: size,
              height: size,
              background: sl.fill,
              opacity: p,
            }}
          />
        ) : null;
      })}
    </Frame>
  );
};

// 0:14–0:18 · Ivory · "Laptops," + "sorted." in Instrument Serif Italic blue
const Card4: React.FC<CardProps> = ({ f }) => (
  <Frame ground="ivory">
    <TextColumn>
      <Headline color={INK} size={150} p={step(f, 0)}>
        Laptops,
      </Headline>
      <div
        style={{
          fontFamily: F.accent, // Instrument Serif Italic
          fontStyle: "italic",
          fontWeight: 400,
          fontSize: 200,
          lineHeight: 0.95,
          color: BLUE,
          opacity: step(f, BEAT),
          transform: `translateY(${(1 - step(f, BEAT)) * 40}px)`,
        }}
      >
        sorted.
      </div>
      <Caption color={INK} p={step(f, 2 * BEAT)}>
        One supplier, from quote to setup.
      </Caption>
    </TextColumn>
    <Block x={560} y={1170} size={230} fill={LIME} p={step(f, 3 * BEAT)} />
    <Block x={700} y={1060} size={230} fill={BLUE_TO_INK(200)} p={step(f, 4 * BEAT)} origin="top left" />
  </Frame>
);

// 0:18–0:20 · Ink · centred lockup, lime CTA pill, URL, blue dot pulses on the final beat
const Card5: React.FC<CardProps> = ({ f }) => {
  const logoW = 600;
  const logoH = logoW / LOGO_RATIO;
  const logo = step(f, 0);
  const cta = step(f, BEAT);
  const url = step(f, BEAT + STEP);
  // Final beat at 0:19.5 (local frame 36): the dot swells and settles over two steps.
  const pulse = interpolate(f, [3 * BEAT, 3 * BEAT + STEP, 3 * BEAT + 2 * STEP], [1, 1.7, 1], clamp);
  return (
    <Frame ground="ink" wordmark={false}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", paddingBottom: 260 }}>
        <div style={{ position: "relative", opacity: logo, transform: `scale(${0.94 + 0.06 * logo})` }}>
          <Img src={staticFile(LOGO_FILE)} style={{ width: logoW, height: logoH, display: "block" }} />
          {/* Blue sign-off dot after the wordmark, on its baseline */}
          <div
            style={{
              position: "absolute",
              left: logoW + 18,
              top: logoH * 0.62,
              width: 30,
              height: 30,
              borderRadius: "50%",
              background: BLUE,
              transform: `scale(${pulse})`,
              opacity: step(f, STEP),
            }}
          />
        </div>
        <div
          style={{
            marginTop: 90,
            display: "flex",
            alignItems: "center",
            gap: 18,
            fontFamily: F.sans,
            fontWeight: 700,
            fontSize: 48,
            color: INK,
            background: LIME,
            borderRadius: 999,
            padding: "28px 56px",
            opacity: cta,
            transform: `translateY(${(1 - cta) * 24}px)`,
          }}
        >
          Request a Quote
          <Arrow color={INK} width={52} stroke={4} />
        </div>
        <div style={{ marginTop: 36, fontFamily: F.sans, fontWeight: 400, fontSize: 36, color: IVORY, opacity: url }}>
          alertglobaltech.com
        </div>
      </AbsoluteFill>
      {/* Small stepped blocks, lower right, one per step */}
      <Block x={W - SIDE - 270} y={1430} size={90} fill={LIME} p={step(f, STEP)} />
      <Block x={W - SIDE - 180} y={1340} size={90} fill={BLUE} p={step(f, 2 * STEP)} />
      <Block x={W - SIDE - 90} y={1250} size={90} fill={BLUE_TO_INK(180)} p={step(f, 3 * STEP)} />
    </Frame>
  );
};
