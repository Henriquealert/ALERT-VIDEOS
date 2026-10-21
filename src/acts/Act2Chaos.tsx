import { AbsoluteFill, interpolate, random, Sequence, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoSpec } from "../spec";
import { ACTS, STAT_BEAT } from "../timing";
import { PixelWindow } from "../ui/PixelWindow";
import { C, Dot, F, eyebrow, useLayout } from "../ui/theme";

const POP_EVERY = 40; // one pain point per beat
const MULTIPLY_EVERY = 3; // then copies flood in

// Act 2: retro desktop on Deep Ink with a fine blue grid; dialogs pop up one by one then bury
// the screen. Optional stat beat in big Archivo numerals.
export const Act2Chaos: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const total = ACTS.chaos.duration;
  const desktopLen = spec.stat ? total - STAT_BEAT : total;
  return (
    <AbsoluteFill>
      <Sequence durationInFrames={desktopLen}>
        <Desktop spec={spec} />
      </Sequence>
      {spec.stat ? (
        <Sequence from={desktopLen} durationInFrames={STAT_BEAT}>
          <StatBeat stat={spec.stat} source={spec.statSource ?? ""} />
        </Sequence>
      ) : null}
    </AbsoluteFill>
  );
};

const Desktop: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, u, portrait } = useLayout();
  const seed = `seed-${spec.slug}`;
  const winW = portrait ? width * 0.72 : width * 0.34;

  const firstPass = spec.painPoints.length * POP_EVERY;
  const copies = Math.max(0, Math.floor((frame - firstPass) / MULTIPLY_EVERY));

  type Win = { at: number; text: string; key: string };
  const wins: Win[] = [
    ...spec.painPoints.map((text, i) => ({ at: i * POP_EVERY, text, key: `p${i}` })),
    ...Array.from({ length: Math.min(copies, 70) }).map((_, i) => ({
      at: firstPass + i * MULTIPLY_EVERY,
      text: spec.painPoints[Math.floor(random(`${seed}-copy-${i}`) * spec.painPoints.length)],
      key: `c${i}`,
    })),
  ];

  // Flames grow as the pile grows.
  const heat = interpolate(frame, [firstPass * 0.5, firstPass + 60], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        background: C.ink,
        backgroundImage: `linear-gradient(${C.hairline} 1px, transparent 1px), linear-gradient(90deg, ${C.hairline} 1px, transparent 1px)`,
        backgroundSize: `${u * 4}px ${u * 4}px`,
      }}
    >
      {wins
        .filter((w) => frame >= w.at)
        .map((w, i) => {
          const pop = spring({ frame: frame - w.at, fps, config: { damping: 11, mass: 0.5 }, durationInFrames: 8 });
          // The first pass is laid out on a loose diagonal; copies land anywhere.
          const isFirst = w.key.startsWith("p");
          const fx = isFirst
            ? 0.06 + ((i * 0.13) % 0.55) + random(`${seed}-wx-${w.key}`) * 0.05
            : random(`${seed}-wx-${w.key}`) * 0.85 - 0.1;
          const fy = isFirst
            ? 0.08 + ((i * 0.11) % 0.6) + random(`${seed}-wy-${w.key}`) * 0.05
            : random(`${seed}-wy-${w.key}`) * 0.95 - 0.1;
          return (
            <PixelWindow
              key={w.key}
              x={portrait ? fx * (width - winW) * 1.2 : fx * width}
              y={fy * height}
              width={winW}
              u={u}
              title={spec.channel}
              message={w.text}
              scale={interpolate(pop, [0, 1], [0.6, 1])}
              frame={frame}
              seed={`${seed}-${w.key}`}
              flames={heat * (isFirst ? 1 : 0.7)}
            />
          );
        })}

      {/* Pixel taskbar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: u * 4.5,
          background: C.raised,
          borderTop: `${u * 0.2}px solid ${C.line}`,
        }}
      />
    </AbsoluteFill>
  );
};

const StatBeat: React.FC<{ stat: string; source: string }> = ({ stat, source }) => {
  const frame = useCurrentFrame();
  const { width, u } = useLayout();
  const fontSize = Math.min((width * 0.8) / (stat.length * 0.68), u * 38);
  const caret = Math.floor(frame / 12) % 2 === 0;
  return (
    <AbsoluteFill style={{ background: C.ink, alignItems: "center", justifyContent: "center", gap: u * 3 }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          fontFamily: F.headline,
          fontWeight: 800,
          fontSize,
          lineHeight: 0.9,
          letterSpacing: "-0.025em",
          color: C.ivory,
        }}
      >
        {stat}
        <span style={{ opacity: caret ? 1 : 0 }}>
          <Dot fontSize={fontSize} color={C.lime} />
        </span>
      </div>
      <div style={eyebrow(u * 2, C.mutedDark)}>{source}</div>
    </AbsoluteFill>
  );
};
