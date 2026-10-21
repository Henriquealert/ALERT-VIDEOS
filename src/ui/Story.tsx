import { Img, interpolate, spring, staticFile, useVideoConfig } from "remotion";
import { C, Dot, F } from "./theme";

// Pieces of the brand Story layout (deck: social mock-ups): wordmark top-left,
// badge pill, big left-aligned sentence-case headline, block composition, line arrow bottom-left.

export const WORDMARK_FILE = "brand/alert-global-tech-wordmark-ivory.png";
export const WORDMARK_RATIO = 1214 / 458;

// Ivory wordmark, for ink or blue grounds only (no Ink version supplied yet).
export const Wordmark: React.FC<{ width: number; opacity?: number; style?: React.CSSProperties }> = ({
  width,
  opacity = 1,
  style,
}) => (
  <Img
    src={staticFile(WORDMARK_FILE)}
    style={{ width: Math.max(64, width), height: Math.max(64, width) / WORDMARK_RATIO, opacity, ...style }}
  />
);

// Badge pill: Electric Blue fill, Ivory DM Sans caps (as "CLIENT STORY").
export const Badge: React.FC<{ text: string; size: number; opacity?: number }> = ({ text, size, opacity = 1 }) => (
  <div
    style={{
      display: "inline-block",
      alignSelf: "flex-start",
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: size,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: C.ivory,
      background: C.blue,
      borderRadius: 999,
      padding: `${size * 0.55}px ${size * 1.1}px`,
      opacity,
    }}
  >
    {text}
  </div>
);

// Thin line arrow pointing right, drawn on with `progress`.
export const LineArrow: React.FC<{ width: number; color: string; progress?: number; style?: React.CSSProperties }> = ({
  width,
  color,
  progress = 1,
  style,
}) => {
  const h = width * 0.4;
  const stroke = Math.max(2, width * 0.045);
  const shaft = width - stroke;
  return (
    <svg width={width} height={h} viewBox={`0 0 ${width} ${h}`} style={style}>
      <line x1={0} y1={h / 2} x2={shaft * progress} y2={h / 2} stroke={color} strokeWidth={stroke} strokeLinecap="round" />
      {progress > 0.6 ? (
        <polyline
          points={`${shaft - h * 0.42},${h * 0.08} ${shaft},${h / 2} ${shaft - h * 0.42},${h * 0.92}`}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={interpolate(progress, [0.6, 1], [0, 1])}
        />
      ) : null}
    </svg>
  );
};

// Block composition: a blue-gradient square, an overlapping lime square and a solid blue
// square, stepping in one after another. Gradients on blue only; lime is always solid.
export const BlockStack: React.FC<{ unit: number; frame: number; ground: "ink" | "ivory"; style?: React.CSSProperties }> = ({
  unit,
  frame,
  ground,
  style,
}) => {
  const { fps } = useVideoConfig();
  const pop = (delay: number) => spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 120 } });
  const a = pop(0);
  const b = pop(6);
  const c = pop(12);
  const block = (p: number, extra: React.CSSProperties): React.CSSProperties => ({
    position: "absolute",
    width: unit,
    height: unit,
    transform: `scale(${p})`,
    transformOrigin: "bottom left",
    opacity: p,
    ...extra,
  });
  return (
    <div style={{ position: "relative", width: unit * 2.1, height: unit * 2, ...style }}>
      <div style={block(a, { left: unit * 1.1, top: 0, background: `linear-gradient(160deg, ${C.blue} 0%, ${C.deepBlue} 100%)` })} />
      <div style={block(b, { left: 0, top: unit * 0.55, background: C.lime })} />
      <div
        style={block(c, {
          left: unit * 0.75,
          top: unit * 1.0,
          background: ground === "ink" ? `linear-gradient(200deg, ${C.blue} 0%, ${C.sky} 100%)` : C.blue,
          mixBlendMode: "normal",
        })}
      />
    </div>
  );
};

// Big left-aligned sentence-case headline (DM Sans SemiBold), ending in the coloured full stop.
// `accent` colours the last phrase; pass endDot={false} for questions.
export const StoryHeadline: React.FC<{
  lines: string[];
  size: number;
  color: string;
  accent?: { text: string; color: string };
  dotColor?: string;
  endDot?: boolean;
  progress?: number;
}> = ({ lines, size, color, accent, dotColor = C.lime, endDot = true, progress = 1 }) => (
  <div
    style={{
      fontFamily: F.headline,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1.02,
      letterSpacing: "-0.03em",
      color,
      opacity: progress,
      transform: `translateY(${interpolate(progress, [0, 1], [size * 0.25, 0])}px)`,
    }}
  >
    {lines.map((l, i) => (
      <div key={i}>
        {l}
        {i === lines.length - 1 && accent ? <span style={{ color: accent.color }}>{accent.text}</span> : null}
        {i === lines.length - 1 && endDot ? <Dot fontSize={size} color={dotColor} /> : null}
      </div>
    ))}
  </div>
);

// Story chrome for a scene: wordmark top-left (dark grounds only, since only an Ivory
// wordmark exists), optional badge under it, line arrow bottom-left. All inside the safe zone.
export const StoryChrome: React.FC<{
  u: number;
  safeY: number;
  ground: "ink" | "ivory";
  badge?: string;
  wordmark?: boolean;
  arrow?: number; // draw-on progress, 0 hides it
  opacity?: number;
}> = ({ u, safeY, ground, badge, wordmark = true, arrow = 1, opacity = 1 }) => {
  const side = u * 6.5;
  const top = Math.max(safeY, u * 6.5);
  const ink = ground === "ink";
  return (
    <div style={{ position: "absolute", inset: 0, opacity }}>
      {wordmark && ink ? <Wordmark width={u * 14} style={{ position: "absolute", left: side, top }} /> : null}
      {badge ? (
        <div style={{ position: "absolute", left: side, top: top + (wordmark && ink ? u * 9 : 0), display: "flex" }}>
          <Badge text={badge} size={u * 2.2} />
        </div>
      ) : null}
      {arrow > 0 ? (
        <LineArrow
          width={u * 10}
          color={ink ? C.ivory : C.ink}
          progress={arrow}
          style={{ position: "absolute", left: side, bottom: Math.max(safeY, u * 6.5) }}
        />
      ) : null}
    </div>
  );
};
