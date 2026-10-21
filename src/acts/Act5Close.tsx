import { AbsoluteFill, Easing, interpolate, Sequence, useCurrentFrame } from "remotion";
import type { VideoSpec } from "../spec";
import { EndCard } from "../ui/EndCard";
import { IsoMaze } from "../ui/IsoMaze";
import { C, useLayout } from "../ui/theme";

const DISSOLVE_LEN = 120;

// Act 5: maze swings top-down and dissolves, then the end card (logo + CTA).
export const Act5Close: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { width, height, u } = useLayout();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence durationInFrames={DISSOLVE_LEN}>
        <IsoMaze
          width={width}
          height={height}
          frame={frame}
          seed={`seed-${spec.slug}`}
          zoom={0.95}
          tilt={interpolate(frame, [0, 45], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) })}
          dissolve={interpolate(frame, [35, DISSOLVE_LEN - 10], [0, 1], clamp)}
          cursors={3}
          cursorSize={u * 4}
        />
      </Sequence>
      <Sequence from={DISSOLVE_LEN}>
        <EndCardShot spec={spec} />
      </Sequence>
    </AbsoluteFill>
  );
};

const EndCardShot: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { u } = useLayout();
  return <EndCard u={u} frame={frame} cta={spec.cta} ctaUrl={spec.ctaUrl} channel={spec.channel} />;
};
