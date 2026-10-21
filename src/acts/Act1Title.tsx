import { AbsoluteFill, interpolate, random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoSpec } from "../spec";
import { GlowPlate } from "../ui/GlowPlate";
import { PixelCursor } from "../ui/PixelCursor";
import { C, Dot, F, useLayout } from "../ui/theme";

const CLICKS = [36, 60, 84]; // each cursor lands on a beat
const CRUMBLE = 100; // letters start breaking up
const BLOCKS_X = 4;
const BLOCKS_Y = 5;

// Act 1: huge statement title (Archivo Narrow Bold Italic, caps, lime full stop).
// Pixel cursors drift in and click it, then the letters crumble into falling brand blocks.
export const Act1Title: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { width, height, u, portrait, safeY } = useLayout();
  const seed = `seed-${spec.slug}`;

  const words = spec.hook.toUpperCase().split(/\s+/);
  const lines = portrait ? words : [words.join(" ")];
  const longest = Math.max(...lines.map((l) => l.length));
  const fontSize = Math.min((width * 0.86) / (longest * 0.56 + 0.3), ((height - 2 * safeY) * 0.62) / lines.length / 0.95);

  // Snap zooms on the click beats keep the 1.5-3 s cut rhythm.
  const zoom = frame < CLICKS[1] ? 1 : frame < CLICKS[2] + 6 ? 1.06 : 1.12;
  const appear = spring({ frame, fps, config: { damping: 14 }, durationInFrames: 12 });

  let letterIndex = 0;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <GlowPlate frame={frame} seed={seed} />
      <AbsoluteFill
        style={{
          alignItems: "center",
          justifyContent: "center",
          transform: `scale(${zoom * appear})`,
        }}
      >
        {lines.map((line, li) => (
          <div
            key={li}
            style={{
              display: "flex",
              alignItems: "baseline",
              fontFamily: F.statement,
              fontStyle: "italic",
              fontWeight: 700,
              fontSize,
              lineHeight: 0.95,
              letterSpacing: "-0.01em",
            }}
          >
            {line.split("").map((ch) => {
              const i = letterIndex++;
              const start = CRUMBLE + random(`${seed}-l${i}`) * 24;
              const broken = frame >= start;
              return (
                <span key={i} style={{ position: "relative", color: C.ivory, whiteSpace: "pre" }}>
                  <span style={{ opacity: broken ? 0 : 1 }}>{ch}</span>
                  {broken && ch !== " "
                    ? Array.from({ length: BLOCKS_X * BLOCKS_Y }).map((_, b) => {
                        const bx = b % BLOCKS_X;
                        const by = Math.floor(b / BLOCKS_X);
                        const t = (frame - start - random(`${seed}-b${i}-${b}`) * 8) / fps;
                        if (t < 0)
                          return <Block key={b} bx={bx} by={by} dx={0} dy={0} spin={0} color={C.ivory} />;
                        const dx = (random(`${seed}-vx${i}-${b}`) - 0.5) * u * 18 * t;
                        const dy = 0.5 * height * 1.6 * t * t - u * 6 * t; // small hop, then gravity
                        return (
                          <Block
                            key={b}
                            bx={bx}
                            by={by}
                            dx={dx}
                            dy={dy}
                            spin={t * 220 * (random(`${seed}-r${i}-${b}`) - 0.5)}
                            color={b % 4 === 0 ? C.lime : b % 4 === 1 ? C.blue : C.ivory}
                          />
                        );
                      })
                    : null}
                </span>
              );
            })}
            {li === lines.length - 1 ? (
              <span style={{ opacity: frame >= CRUMBLE + 24 ? 0 : 1 }}>
                <Dot fontSize={fontSize} color={C.lime} />
              </span>
            ) : null}
          </div>
        ))}
      </AbsoluteFill>

      {CLICKS.map((at, ci) => {
        // Each cursor drifts in from an edge and clicks a point on the title.
        const fromX = random(`${seed}-cx${ci}`) > 0.5 ? width * 1.05 : -width * 0.05;
        const fromY = height * (0.15 + random(`${seed}-cy${ci}`) * 0.7);
        const toX = width * (0.3 + 0.2 * ci + (random(`${seed}-tx${ci}`) - 0.5) * 0.1);
        const toY = height * (0.45 + (random(`${seed}-ty${ci}`) - 0.5) * 0.15);
        const p = interpolate(frame, [at - 30, at], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const eased = 1 - Math.pow(1 - p, 3);
        const leave = interpolate(frame, [CRUMBLE + 20, CRUMBLE + 40], [1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        return (
          <PixelCursor
            key={ci}
            x={interpolate(eased, [0, 1], [fromX, toX])}
            y={interpolate(eased, [0, 1], [fromY, toY])}
            size={u * 6}
            clicking={frame >= at && frame < at + 6}
            opacity={leave}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const Block: React.FC<{ bx: number; by: number; dx: number; dy: number; spin: number; color: string }> = ({
  bx,
  by,
  dx,
  dy,
  spin,
  color,
}) => (
  <span
    style={{
      position: "absolute",
      left: `${(bx / BLOCKS_X) * 100}%`,
      top: `${10 + (by / BLOCKS_Y) * 80}%`,
      width: `${100 / BLOCKS_X}%`,
      height: `${80 / BLOCKS_Y}%`,
      background: color,
      transform: `translate(${dx}px, ${dy}px) rotate(${spin}deg)`,
    }}
  />
);
