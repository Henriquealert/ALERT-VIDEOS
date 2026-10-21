import { useId } from "react";
import { AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { WORDMARK_RATIO } from "../ui/Story";
import { C, Dot, F } from "../ui/theme";

// "Data, sorted." 60 s explainer, 9x16, 30 fps. Fixed copy from Henrique's brief (21 Oct 2026).
// Engraving-style line drawings that draw themselves on, on Soft Ivory; Deep Ink end card.
// No people anywhere; offscreen narrator only. Statistics carry their source on screen.
// Rendered in the brand identity (Henrique, 21 Oct 2026): Deep Ink line, Electric Blue as the one
// accent, Acid Lime only for the CTA pill and the full stop on ink. Headlines DM Sans SemiBold,
// sentence case, left-aligned, ending in the coloured full stop; Instrument Serif Italic only on
// "sorted". Labels DM Sans. Text on blue is always Ivory (never ink on blue).
// Frame: ink wordmark top-left and a line arrow bottom-left on ivory scenes; the lockup alone on the end card.
// Scene cuts follow the voiceover (it runs about 53 s): 0, 4.5, 13, 21.5, 37.3, 47, 60 s.
// Voice lines are placed by scripts/mix-data-sorted-voiceover.py at the times used below.

export const DATA_SORTED = { fps: 30, durationInFrames: 1800, width: 1080, height: 1920 } as const;

// Brand tokens (src/ui/theme.tsx). Blue-family tints appear only as the blue gradient stops.
const IVORY = C.ivory;
const INK = C.ink;
const BLUE = C.blue;
const LIME = C.lime;
const SKY = C.sky;
const SKY_LIGHT = C.skyLight;
const WORDMARK_INK = "brand/alert-global-tech-wordmark-ink.png";
const SIDE = 80;
const SAFE = 250; // Story safe zone, top and bottom

const W = 1080;
const H = 1920;
const FPS = 30;
const STROKE = 3.5; // one weight for every line
const s = (sec: number) => Math.round(sec * FPS);
const SCENES = [0, 4.5, 13, 21.5, 37.3, 47, 60].map(s);
const MIX = "audio/Alert Global Tech - Data Sorted Mix.wav";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const io = Easing.inOut(Easing.cubic);
// 0 → 1 with a smooth ease-in-out, starting at second `t`.
const ease = (fr: number, t: number, len = 12) => interpolate(fr, [s(t), s(t) + len], [0, 1], { ...clamp, easing: io });
// Springy 0 → 1 (overshoots a little) for pops and slides.
const pop = (fr: number, t: number) => spring({ frame: fr - s(t), fps: FPS, config: { damping: 11, stiffness: 180, mass: 0.7 } });
const slide = (fr: number, t: number) => spring({ frame: fr - s(t), fps: FPS, config: { damping: 15, stiffness: 130, mass: 0.9 } });

export const DataSorted: React.FC = () => {
  const fr = useCurrentFrame();
  const scenes = [Hook, Questions, Compounds, Cost, Fix, Close];
  return (
    <AbsoluteFill style={{ background: IVORY }}>
      <Audio src={staticFile(MIX)} />
      {scenes.map((Scene, i) => {
        const start = SCENES[i];
        const end = SCENES[i + 1];
        if (fr < start || fr >= end) return null;
        // Each beat cleanly replaces the last: slide left and fade over the final 8 frames.
        const out = i === scenes.length - 1 ? 0 : interpolate(fr, [end - 8, end], [0, 1], { ...clamp, easing: io });
        return (
          <AbsoluteFill key={i} style={{ opacity: 1 - out, transform: `translateX(${-160 * out}px)` }}>
            <Scene fr={fr} />
          </AbsoluteFill>
        );
      })}
      {/* Story frame on the ivory scenes; the end card carries the lockup instead */}
      {fr < SCENES[5] + 10 ? (
        <AbsoluteFill style={{ opacity: 1 - interpolate(fr, [SCENES[5], SCENES[5] + 10], [0, 1], clamp) }}>
          <Img src={staticFile(WORDMARK_INK)} style={{ position: "absolute", left: SIDE, top: SAFE, width: 150, height: 150 / WORDMARK_RATIO }} />
          <LineArrow x={SIDE} y={H - SAFE - 40} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

type SceneProps = { fr: number };

// ---------- Drawing kit ----------

// Line drawing that draws itself on: each path traces in turn (overlapping), hatching wipes in after.
const Sketch: React.FC<{
  w: number;
  h: number;
  paths: string[];
  p: number;
  hatch?: string;
  hp?: number;
  color?: string;
  children?: React.ReactNode; // accent fills and text, drawn on top
}> = ({ w, h, paths, p, hatch, hp = 0, color = INK, children }) => {
  const clip = "c" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const o = 0.45;
  const total = 1 + (paths.length - 1) * o;
  const line = { fill: "none", stroke: color, strokeWidth: STROKE, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ overflow: "visible", display: "block" }}>
      {hatch && hp > 0 ? (
        <>
          <clipPath id={clip}>
            <rect x={-10} y={-10} width={(w + 20) * hp} height={h + 20} />
          </clipPath>
          <path d={hatch} {...line} clipPath={`url(#${clip})`} />
        </>
      ) : null}
      {paths.map((d, i) => {
        const q = Math.max(0, Math.min(1, p * total - i * o));
        return q > 0 ? <path key={i} d={d} {...line} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - q} /> : null;
      })}
      {children}
    </svg>
  );
};

// Absolutely placed, centred on (x, y); slides in from the right on `sl` (0 → 1).
const Place: React.FC<{ x: number; y: number; sl?: number; scale?: number; opacity?: number; children: React.ReactNode }> = ({
  x,
  y,
  sl = 1,
  scale = 1,
  opacity = 1,
  children,
}) =>
  sl <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        opacity: Math.min(1, sl * 2) * opacity,
        transform: `translate(-50%, -50%) translateX(${(1 - sl) * 420}px) scale(${scale})`,
      }}
    >
      {children}
    </div>
  );

// Soft rounded pill chip for labels and numbers.
const Chip: React.FC<{ x: number; y: number; text: string; p: number; filled?: boolean; size?: number }> = ({
  x,
  y,
  text,
  p,
  filled = false,
  size = 34,
}) =>
  p <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        transform: `translate(-50%, -50%) scale(${p})`,
        opacity: Math.min(1, p * 2),
        fontFamily: F.sans,
        fontWeight: 500,
        fontSize: size,
        lineHeight: 1,
        color: filled ? IVORY : INK,
        background: filled ? BLUE : IVORY,
        border: `${STROKE}px solid ${filled ? BLUE : INK}`,
        borderRadius: 999,
        padding: "0.42em 0.95em 0.46em",
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </div>
  );

// Round answer chip: filled blue "Y", outlined ink "N", or a check mark (ivory on blue).
const RoundChip: React.FC<{ x: number; y: number; p: number; kind: "Y" | "N" | "check"; d?: number }> = ({ x, y, p, kind, d = 108 }) =>
  p <= 0 ? null : (
    <div
      style={{
        position: "absolute",
        left: x - d / 2,
        top: y - d / 2,
        width: d,
        height: d,
        borderRadius: "50%",
        boxSizing: "border-box",
        background: kind === "N" ? IVORY : BLUE,
        border: `${STROKE}px solid ${kind === "N" ? INK : BLUE}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: `scale(${p})`,
        opacity: Math.min(1, p * 2),
        fontFamily: F.sans,
        fontWeight: 600,
        fontSize: d * 0.46,
        color: kind === "N" ? INK : IVORY,
      }}
    >
      {kind === "check" ? (
        <svg width={d * 0.5} height={d * 0.5} viewBox="0 0 50 50">
          <path d="M9,26 L21,38 L42,13" fill="none" stroke={IVORY} strokeWidth={STROKE * 1.4} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        kind
      )}
    </div>
  );

// Tiny muted source caption under a statistic.
const Source: React.FC<{ y: number; p: number; text: string }> = ({ y, p, text }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      top: y,
      width: W,
      textAlign: "center",
      fontFamily: F.sans,
      fontWeight: 400,
      fontSize: 24,
      color: C.mutedLight,
      opacity: p,
    }}
  >
    {text}
  </div>
);

// Headline: DM Sans SemiBold, sentence case, left-aligned, tight leading, ending in the coloured
// full stop (blue on ivory, lime on ink). `accent` sets the last word in Instrument Serif Italic.
const Headline: React.FC<{
  y: number;
  p: number;
  text: string;
  accent?: string;
  size?: number;
  color?: string;
  dot?: string;
  align?: "left" | "center";
}> = ({ y, p, text, accent, size = 120, color = INK, dot = BLUE, align = "left" }) => (
  <div
    style={{
      position: "absolute",
      left: align === "left" ? SIDE : 0,
      top: y,
      width: align === "left" ? W - 2 * SIDE : W,
      textAlign: align,
      fontFamily: F.headline,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 0.95,
      letterSpacing: "-0.03em",
      color,
      opacity: p,
      transform: `translateY(${(1 - p) * 30}px)`,
    }}
  >
    {text}
    {accent ? (
      <span style={{ fontFamily: F.accent, fontStyle: "italic", fontWeight: 400, fontSize: size * 1.12, letterSpacing: "-0.01em" }}>{accent}</span>
    ) : null}
    <Dot fontSize={size} color={dot} />
  </div>
);

// Thin line arrow, the Story frame's bottom-left element.
const LineArrow: React.FC<{ x: number; y: number; color?: string }> = ({ x, y, color = INK }) => (
  <svg width={96} height={36} viewBox="0 0 96 36" style={{ position: "absolute", left: x, top: y }}>
    <path d="M3,18 H93 M76,3 L93,18 L76,33" fill="none" stroke={color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ---------- Geometry ----------

const ellipse = (cx: number, cy: number, rx: number, ry: number) =>
  `M${cx - rx},${cy} a${rx},${ry} 0 1,0 ${2 * rx},0 a${rx},${ry} 0 1,0 ${-2 * rx},0`;
const frontArc = (cx: number, cy: number, rx: number, ry: number) => `M${cx - rx},${cy} a${rx},${ry} 0 0,0 ${2 * rx},0`;
const rrect = (x: number, y: number, w: number, h: number, r: number) =>
  `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
const lines = (segs: [number, number, number, number][]) => segs.map(([a, b, c, d]) => `M${a},${b} L${c},${d}`).join(" ");
const range = (a: number, b: number, step: number) => {
  const out: number[] = [];
  for (let v = a; v <= b + 1e-6; v += step) out.push(v);
  return out;
};
const sparkle = (cx: number, cy: number, r: number) =>
  `M${cx},${cy - r} Q${cx + r * 0.12},${cy - r * 0.12} ${cx + r},${cy} Q${cx + r * 0.12},${cy + r * 0.12} ${cx},${cy + r} Q${cx - r * 0.12},${cy + r * 0.12} ${cx - r},${cy} Q${cx - r * 0.12},${cy - r * 0.12} ${cx},${cy - r} Z`;

// Database cylinder, 300 x 370
const CYL = { cx: 150, rx: 130, ry: 40, ys: [50, 137, 223, 310] };
const cylinderPaths = [
  ellipse(CYL.cx, CYL.ys[0], CYL.rx, CYL.ry),
  `M20,50 V310`,
  `M280,50 V310`,
  frontArc(CYL.cx, CYL.ys[3], CYL.rx, CYL.ry),
  frontArc(CYL.cx, CYL.ys[1], CYL.rx, CYL.ry),
  frontArc(CYL.cx, CYL.ys[2], CYL.rx, CYL.ry),
];
const arcY = (x: number) => CYL.ry * Math.sqrt(Math.max(0, 1 - ((x - CYL.cx) / CYL.rx) ** 2));
const cylinderHatch = lines(
  [0, 1, 2].flatMap((band) =>
    range(206, 270, 12).map((x) => [x, CYL.ys[band] + arcY(x) + 9, x, CYL.ys[band + 1] + arcY(x) - 9] as [number, number, number, number]),
  ),
);

// Chat bubble, 320 x 280
const bubblePath = `M50,10 H270 Q310,10 310,50 V170 Q310,210 270,210 H130 L60,265 L80,210 H50 Q10,210 10,170 V50 Q10,10 50,10 Z`;

// Filing cabinet, 300 x 400
const cabinetPaths = [
  rrect(40, 30, 200, 350, 6),
  `M40,30 L80,10 H280 L240,30`,
  `M240,380 L280,360 V10`,
  ...[0, 1, 2].map((i) => rrect(58, 48 + i * 112, 164, 96, 6)),
  ...[0, 1, 2].map((i) => `M112,${96 + i * 112} Q140,${106 + i * 112} 168,${96 + i * 112}`),
  ...[0, 1, 2].map((i) => rrect(124, 60 + i * 112, 32, 18, 3)),
];
const cabinetHatch = lines(range(250, 272, 8).map((x) => [x, 30 - (x - 240) * 0.5 + 8, x, 380 - (x - 240) * 0.5 - 8] as [number, number, number, number]));

// Document, 300 x 380
const docPaths = [`M20,10 H220 L280,70 V370 H20 Z`, `M220,10 V70 H280`, `M52,110 H220`, `M52,148 H248`, `M52,186 H190`, `M52,326 H236`];
const docHatch = lines(range(228, 272, 9).map((x) => [x, 22 + (x - 220), x, 66] as [number, number, number, number]));

// CRM contact card, 320 x 220 (company badge, no people)
const crmPaths = [
  rrect(10, 10, 300, 200, 22),
  `M10,62 H310`,
  rrect(30, 84, 62, 82, 4),
  `M44,166 V146 H78 V166`,
  `M110,96 H280`,
  `M110,128 H240`,
];
const crmHatch = lines(range(40, 82, 10).flatMap((x) => [[x, 96, x, 106], [x, 116, x, 126]] as [number, number, number, number][]));

// Bar-chart report, 300 x 360
const BARS = [
  [74, 92],
  [126, 150],
  [178, 112],
  [230, 176],
];
const reportPaths = [rrect(20, 10, 260, 340, 12), `M60,48 V270 H262`, ...BARS.map(([x, h]) => `M${x},270 V${270 - h} H${x + 32} V270`)];
const reportHatch = lines(BARS.flatMap(([x, h]) => range(x + 8, x + 26, 9).map((xx) => [xx, 270 - h + 8, xx, 266] as [number, number, number, number])));

// Banknote stack, 360 x 260
const notePaths = [
  rrect(60, 30, 280, 150, 8),
  rrect(40, 55, 280, 150, 8),
  rrect(20, 80, 280, 150, 8),
  rrect(34, 94, 252, 122, 4),
  ellipse(160, 155, 38, 46),
  ellipse(64, 124, 10, 10),
  ellipse(256, 186, 10, 10),
];
const noteHatch = lines([
  ...range(112, 200, 11).map((y) => [92, y, 112, y] as [number, number, number, number]),
  ...range(112, 200, 11).map((y) => [208, y, 228, y] as [number, number, number, number]),
]);

// Pie chart, 300 x 300: a quarter filled in steel blue
const pieRest = `M150,150 L270,150 A120,120 0 1,1 150,30 Z`;
const pieQuarter = `M150,150 V30 A120,120 0 0,1 270,150 Z`;
const piePaths = [`M150,30 A120,120 0 1,0 270,150 A120,120 0 0,0 150,30`, `M150,150 V30`, `M150,150 H270`];
const pieHatch = lines(range(-260, 300, 15).map((c) => [c, 300, c + 300, 0] as [number, number, number, number]));

// Gauge, 480 x 300
const G = { cx: 240, cy: 250, r: 200 };
const gPt = (v: number, r: number) => [G.cx + r * Math.cos(Math.PI * (1 - v)), G.cy - r * Math.sin(Math.PI * (1 - v))] as const;
const gArc = (v0: number, v1: number, r: number) => {
  const [x0, y0] = gPt(v0, r);
  const [x1, y1] = gPt(v1, r);
  return `M${x0},${y0} A${r},${r} 0 0,1 ${x1},${y1}`;
};
const gaugePaths = [
  gArc(0, 1, G.r),
  gArc(0, 1, 160),
  `M20,250 H460`,
  ...range(0, 1, 0.1).map((v) => {
    const [a, b] = gPt(v, 168);
    const [c, d] = gPt(v, 190);
    return `M${a},${b} L${c},${d}`;
  }),
];

// Input form with a tick, 300 x 300
const formPaths = [
  rrect(20, 10, 260, 280, 18),
  `M46,50 H112`,
  rrect(46, 62, 208, 46, 10),
  `M46,136 H132`,
  rrect(46, 148, 208, 46, 10),
  rrect(46, 222, 112, 46, 23),
  `M206,86 L218,98 L238,74`,
];
const formHatch = lines(range(60, 140, 10).map((x) => [x, 236, x, 254] as [number, number, number, number]));

// Folder with a key tag, 320 x 280
const folderPaths = [
  `M20,60 H120 L145,85 H300 V260 H20 Z`,
  `M20,108 H300`,
  ellipse(96, 184, 28, 28),
  ellipse(96, 184, 10, 10),
  `M124,184 H236 M196,184 V206 M216,184 V200`,
  `M68,184 Q40,150 60,128`,
  `M48,104 L74,118 L66,140 L40,134 L34,112 Z`,
];
const folderHatch = lines(range(250, 290, 10).map((x) => [x, 120, x, 250] as [number, number, number, number]));

// A card for the "two become one" merge, 180 x 120
const cardPaths = [rrect(0, 0, 180, 120, 14), `M22,40 H150`, `M22,72 H112`];

// The figure with one wrong digit, circled in steel blue when `cp` > 0.
const ErrorFigure: React.FC<{ x: number; y: number; size: number; cp: number; op?: number }> = ({ x, y, size, cp, op = 1 }) => {
  const style = { fontFamily: F.sans, fontWeight: 600, fontSize: size } as const;
  const gap = size * 0.34;
  return (
    <g opacity={op}>
      <text x={x - gap} y={y} textAnchor="end" fill={INK} style={style}>
        1,2
      </text>
      <text x={x} y={y} textAnchor="middle" fill={INK} style={style}>
        9
      </text>
      <text x={x + gap} y={y} textAnchor="start" fill={INK} style={style}>
        0
      </text>
      {cp > 0 ? (
        <ellipse
          cx={x}
          cy={y - size * 0.36}
          rx={size * 0.56}
          ry={size * 0.74}
          fill="none"
          stroke={BLUE}
          strokeWidth={STROKE * 1.3}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - cp}
          transform={`rotate(-12 ${x} ${y - size * 0.36})`}
        />
      ) : null}
    </g>
  );
};

// ---------- Scenes ----------

// 0–4.5 s · Hook. VO 0.3: "Your AI is only as good as the data you feed it."
const Hook: React.FC<SceneProps> = ({ fr }) => (
  <>
    <Place x={540} y={630} sl={slide(fr, 0.1)}>
      <Sketch w={300} h={370} paths={cylinderPaths} p={ease(fr, 0.2, 30)} hatch={cylinderHatch} hp={ease(fr, 1.0, 14)} />
    </Place>
    <Chip x={540} y={880} text="Your data" p={pop(fr, 1.1)} />
    <Place x={540} y={1025}>
      <Sketch w={60} h={170} paths={[`M30,5 V160`, `M12,136 L30,162 L48,136`]} p={ease(fr, 1.5, 12)} />
    </Place>
    <Place x={540} y={1250} sl={slide(fr, 1.8)}>
      <Sketch w={320} h={280} paths={[bubblePath, `M70,182 H150`]} p={ease(fr, 1.9, 22)}>
        <g transform={`translate(160 110) scale(${pop(fr, 2.5)}) translate(-160 -110)`}>
          <path d={sparkle(160, 104, 52)} fill={BLUE} />
        </g>
        <g transform={`translate(236 64) scale(${pop(fr, 2.7)}) translate(-236 -64)`}>
          <path d={sparkle(236, 64, 20)} fill={BLUE} />
        </g>
      </Sketch>
    </Place>
    <Chip x={540} y={1450} text="AI answer" p={pop(fr, 2.8)} />
  </>
);

// 4.5–13 s · Three questions. VO 4.7 "Before you roll out Copilot..." · 8.0 · 9.75 · 10.75
const QUESTIONS = [
  { text: "One place?", at: 8.0, chip: "Y" as const, chipAt: 9.3 },
  { text: "Up to date?", at: 9.75, chip: "N" as const, chipAt: 10.45 },
  { text: "Has an owner?", at: 10.75, chip: "N" as const, chipAt: 11.6 },
];
const Questions: React.FC<SceneProps> = ({ fr }) => {
  const disc = pop(fr, 4.6);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: 540 - 250,
          top: 610 - 250,
          width: 500,
          height: 500,
          borderRadius: "50%",
          background: SKY_LIGHT,
          opacity: Math.min(1, disc),
          transform: `scale(${disc})`,
        }}
      />
      <Place x={540} y={610} sl={slide(fr, 4.7)}>
        <Sketch w={300} h={400} paths={cabinetPaths} p={ease(fr, 4.8, 30)} hatch={cabinetHatch} hp={ease(fr, 5.8, 14)} />
      </Place>
      {QUESTIONS.map((q, i) => {
        const y = 1010 + i * 170;
        const sl = slide(fr, q.at);
        return (
          <div key={q.text}>
            {sl > 0 ? (
              <div
                style={{
                  position: "absolute",
                  left: 130,
                  top: y - 50,
                  fontFamily: F.headline,
                  fontWeight: 600,
                  fontSize: 80,
                  letterSpacing: "-0.02em",
                  lineHeight: 1,
                  color: INK,
                  opacity: Math.min(1, sl * 2),
                  transform: `translateX(${(1 - sl) * 420}px)`,
                }}
              >
                {q.text}
              </div>
            ) : null}
            <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
              <line
                x1={130}
                y1={y + 76}
                x2={950}
                y2={y + 76}
                stroke={INK}
                strokeWidth={STROKE}
                strokeLinecap="round"
                opacity={0.25}
                pathLength={1}
                strokeDasharray="1 1"
                strokeDashoffset={1 - ease(fr, q.at + 0.1, 14)}
              />
            </svg>
            <RoundChip x={890} y={y - 10} p={pop(fr, q.chipAt)} kind={q.chip} />
          </div>
        );
      })}
    </>
  );
};

// 13–21.5 s · The error compounds. VO 13.2 "Here's the sneaky part:" · 14.5 "one wrong record gets copied
// into the CRM (17.0), then the sales report (17.3), then the answer your team gets from AI (18.45)."
const COPIES = [
  { at: 16.5, chip: "×1", x: 190 },
  { at: 17.25, chip: "×2", x: 540 },
  { at: 18.45, chip: "×3", x: 890 },
];
const Compounds: React.FC<SceneProps> = ({ fr }) => (
  <>
    <Place x={540} y={600} sl={slide(fr, 13.2)}>
      <Sketch w={300} h={380} paths={docPaths} p={ease(fr, 13.3, 22)} hatch={docHatch} hp={ease(fr, 13.9, 10)}>
        <ErrorFigure x={150} y={268} size={56} cp={ease(fr, 14.6, 14)} op={ease(fr, 13.8, 10)} />
      </Sketch>
    </Place>
    {/* The copies, in a row */}
    <Place x={COPIES[0].x} y={1120} sl={slide(fr, COPIES[0].at)} scale={0.8}>
      <Sketch w={320} h={220} paths={crmPaths} p={ease(fr, COPIES[0].at, 14)} hatch={crmHatch} hp={ease(fr, COPIES[0].at + 0.3, 8)}>
        <text x={26} y={46} fill={INK} style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 26 }}>
          CRM
        </text>
        <ErrorFigure x={200} y={190} size={40} cp={ease(fr, COPIES[0].at + 0.3, 10)} />
      </Sketch>
    </Place>
    <Place x={COPIES[1].x} y={1120} sl={slide(fr, COPIES[1].at)} scale={0.66}>
      <Sketch w={300} h={360} paths={reportPaths} p={ease(fr, COPIES[1].at, 14)} hatch={reportHatch} hp={ease(fr, COPIES[1].at + 0.3, 8)}>
        <ErrorFigure x={160} y={330} size={46} cp={ease(fr, COPIES[1].at + 0.3, 10)} />
      </Sketch>
    </Place>
    <Place x={COPIES[2].x} y={1110} sl={slide(fr, COPIES[2].at)} scale={0.74}>
      <Sketch w={320} h={280} paths={[bubblePath]} p={ease(fr, COPIES[2].at, 14)}>
        <path d={sparkle(262, 52, 18)} fill={BLUE} opacity={ease(fr, COPIES[2].at + 0.2, 6)} />
        <ErrorFigure x={160} y={140} size={60} cp={ease(fr, COPIES[2].at + 0.4, 10)} />
      </Sketch>
    </Place>
    {COPIES.map((c, i) => (
      <Chip key={c.chip} x={c.x} y={1330} text={c.chip} p={pop(fr, [17.0, 17.9, 19.6][i])} filled={i === 2} />
    ))}
  </>
);

// 21.5–37.3 s · The cost, then the turn.
// VO 21.7 "And it adds up fast." · 23.4 Forrester (quarter ~24.6, five million ~27.3) · 29.9 IBM ·
// 35.2 "The good news?" (needle swings) · 36.05 "It's fixable."
const Cost: React.FC<SceneProps> = ({ fr }) => {
  const a = 1 - ease(fr, 29.6, 12); // cross-fade out the first pair
  const b = ease(fr, 29.75, 12);
  const swing = spring({ frame: fr - s(35.2), fps: FPS, config: { damping: 14, stiffness: 60, mass: 1 } });
  const v = 0.45 + 0.49 * swing; // swings up to the top of the scale (94%) so the needle stays visible
  const glow = ease(fr, 35.3, 18);
  const statOut = 1 - ease(fr, 35.2, 10);
  const [nx, ny] = gPt(v, 150);
  return (
    <>
      {a > 0 ? (
        <AbsoluteFill style={{ opacity: a }}>
          <Place x={290} y={820} sl={slide(fr, 21.7)}>
            <Sketch w={360} h={260} paths={notePaths} p={ease(fr, 21.8, 26)} hatch={noteHatch} hp={ease(fr, 22.6, 12)}>
              <text x={160} y={174} textAnchor="middle" fill={INK} opacity={ease(fr, 22.4, 8)} style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 52 }}>
                $
              </text>
            </Sketch>
          </Place>
          <Place x={800} y={820} sl={slide(fr, 23.4)}>
            <Sketch w={300} h={300} paths={piePaths} p={ease(fr, 23.5, 22)}>
              <clipPath id="pie-rest">
                <path d={pieRest} />
              </clipPath>
              <path d={pieHatch} stroke={INK} strokeWidth={STROKE} clipPath="url(#pie-rest)" opacity={0.35 * ease(fr, 24.2, 10)} />
              <g transform={`translate(${10 * pop(fr, 24.6)} ${-10 * pop(fr, 24.6)})`}>
                <path d={pieQuarter} fill={BLUE} opacity={ease(fr, 24.6, 8)} stroke={INK} strokeWidth={STROKE} strokeLinejoin="round" />
              </g>
            </Sketch>
          </Place>
          <Chip x={290} y={1070} text="$5M+ a year" p={pop(fr, 27.3)} />
          <Chip x={800} y={1070} text="1 in 4+ orgs" p={pop(fr, 25.2)} filled />
          <Source y={1150} p={ease(fr, 28.0, 10)} text="Source: Forrester, via IBM Think, Jan 2026" />
        </AbsoluteFill>
      ) : null}
      {b > 0 ? (
        <AbsoluteFill style={{ opacity: b }}>
          <Place x={540} y={800}>
            <Sketch w={480} h={300} paths={gaugePaths} p={ease(fr, 29.75, 24)} color={glow > 0.5 ? BLUE : INK}>
              {glow > 0 ? <path d={gArc(0, v, 180)} fill="none" stroke={SKY} strokeWidth={34} opacity={0.6 * glow} /> : null}
              <path d={gArc(0, 1, G.r)} fill="none" stroke={BLUE} strokeWidth={STROKE} opacity={glow} />
              <g opacity={ease(fr, 30.3, 8)}>
                <line x1={G.cx} y1={G.cy} x2={nx} y2={ny} stroke={glow > 0.5 ? BLUE : INK} strokeWidth={STROKE * 1.6} strokeLinecap="round" />
                <circle cx={G.cx} cy={G.cy} r={14} fill={IVORY} stroke={INK} strokeWidth={STROKE} />
              </g>
            </Sketch>
          </Place>
          <AbsoluteFill style={{ opacity: statOut }}>
            <Chip x={540} y={1060} text="45%" p={pop(fr, 31.0)} size={44} />
            <Source y={1140} p={ease(fr, 31.5, 10)} text="Source: IBM Institute for Business Value" />
          </AbsoluteFill>
          <Headline y={1090} p={ease(fr, 36.05, 12)} text="It's fixable" />
        </AbsoluteFill>
      ) : null}
    </>
  );
};

// 37.3–47 s · The fix. VO 37.5 "Start early." · 38.6 "Check data where it's entered." ·
// 40.3 "Remove duplicates." · 41.6 "Give every dataset an owner." · 43.55 "Then let AI work..."
const Fix: React.FC<SceneProps> = ({ fr }) => {
  const merge = ease(fr, 40.6, 16);
  const ROW = 960;
  const labels = [
    { x: 200, text: "Check at entry", at: 39.4, chip: 39.7 },
    { x: 540, text: "Remove duplicates", at: 41.1, chip: 41.3 },
    { x: 880, text: "Give it an owner", at: 42.6, chip: 42.9 },
  ];
  return (
    <>
      <Headline y={400} p={ease(fr, 37.45, 12)} size={110} text="Start early" />
      <Place x={200} y={ROW} sl={slide(fr, 38.5)} scale={0.86}>
        <Sketch w={300} h={300} paths={formPaths} p={ease(fr, 38.55, 20)} hatch={formHatch} hp={ease(fr, 39.2, 8)} />
      </Place>
      <Place x={540} y={ROW} sl={slide(fr, 40.2)} scale={0.86}>
        <svg width={320} height={300} style={{ overflow: "visible", display: "block" }}>
          {[
            [10, 20],
            [130, 160],
          ].map(([x0, y0], i) => (
            <g key={i} transform={`translate(${x0 + (70 - x0) * merge} ${y0 + (90 - y0) * merge})`} opacity={i === 1 ? 1 - merge * 0.999 : 1}>
              <Sketch w={180} h={120} paths={cardPaths} p={ease(fr, 40.25 + i * 0.1, 12)} />
            </g>
          ))}
        </svg>
      </Place>
      <Place x={880} y={ROW} sl={slide(fr, 41.6)} scale={0.86}>
        <Sketch w={320} h={280} paths={folderPaths} p={ease(fr, 41.65, 22)} hatch={folderHatch} hp={ease(fr, 42.3, 8)} />
      </Place>
      {labels.map((l) => (
        <div key={l.text}>
          <Chip x={l.x} y={ROW + 190} text={l.text} p={pop(fr, l.at)} size={26} />
          <RoundChip x={l.x + 82} y={ROW - 128} p={pop(fr, l.chip)} kind="check" d={76} />
        </div>
      ))}
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
        <path
          d={ellipse(540, ROW + 40, 512, 430)}
          fill="none"
          stroke={BLUE}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 1"
          strokeDashoffset={1 - ease(fr, 43.6, 36)}
          opacity={ease(fr, 43.6, 2)}
        />
      </svg>
    </>
  );
};

// 47–60 s · Close. VO 47.6 "Alert Global Tech helps you get Microsoft 365, SharePoint and Copilot
// ready for real work." · 53.6 "Hardware, software and AI, sorted." · 56.5 "Book a Sprint." Holds to 60 s.
const Close: React.FC<SceneProps> = ({ fr }) => {
  const night = ease(fr, 47.0, 18);
  const rise = ease(fr, 47.3, 30);
  const beamDim = 1 - 0.72 * ease(fr, 48.4, 20);
  const logo = ease(fr, 47.6, 14);
  const logoW = 360;
  return (
    <>
      <AbsoluteFill style={{ background: INK, opacity: night }} />
      {/* The beam rises from the bottom edge through the centre: blue → sky gradient (brand beam) */}
      <div
        style={{
          position: "absolute",
          left: W / 2 - 60,
          top: 0,
          width: 120,
          height: H,
          transformOrigin: "bottom",
          transform: `scaleY(${rise})`,
          opacity: beamDim,
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(0deg, transparent 0%, ${BLUE} 40%, transparent 100%)`,
            opacity: 0.5,
            filter: "blur(24px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: 58,
            top: 0,
            width: 4,
            height: H,
            background: `linear-gradient(0deg, transparent 0%, ${BLUE} 25%, ${SKY} 50%, ${SKY_LIGHT} 70%, transparent 100%)`,
          }}
        />
      </div>
      <Img
        src={staticFile(LOGO_FILE)}
        style={{
          position: "absolute",
          left: W / 2 - logoW / 2,
          top: 420,
          width: logoW,
          height: logoW / LOGO_RATIO,
          opacity: logo,
          transform: `translateY(${(1 - logo) * 20}px)`,
        }}
      />
      <Headline y={790} p={ease(fr, 48.2, 20)} size={150} text="Data, " accent="sorted" color={IVORY} dot={LIME} align="center" />
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 1010,
          width: W,
          textAlign: "center",
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: 36,
          letterSpacing: "0.02em",
          color: C.mutedDark,
          opacity: ease(fr, 49.6, 14),
        }}
      >
        Microsoft 365 · SharePoint · Copilot
      </div>
      {pop(fr, 56.4) > 0 ? (
        <div
          style={{
            position: "absolute",
            left: W / 2,
            top: 1210,
            transform: `translate(-50%, -50%) scale(${pop(fr, 56.4)})`,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 46,
            lineHeight: 1,
            color: INK,
            background: LIME,
            borderRadius: 999,
            padding: "30px 64px 32px",
            whiteSpace: "nowrap",
          }}
        >
          Book a Sprint
        </div>
      ) : null}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 1310,
          width: W,
          textAlign: "center",
          fontFamily: F.sans,
          fontWeight: 400,
          fontSize: 34,
          color: IVORY,
          opacity: 0.8 * ease(fr, 56.8, 10),
        }}
      >
        alertglobaltech.com
      </div>
      <div style={{ opacity: ease(fr, 47.6, 14) }}>
        <LineArrow x={SIDE} y={H - SAFE - 40} color={IVORY} />
      </div>
    </>
  );
};
