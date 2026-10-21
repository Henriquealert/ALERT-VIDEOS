import { AbsoluteFill, Easing, interpolate, useCurrentFrame } from "remotion";
import type { VideoSpec } from "../spec";
import { GlowPlate } from "../ui/GlowPlate";
import { IsoMaze } from "../ui/IsoMaze";
import { C, useLayout } from "../ui/theme";

// Act 3: isometric maze with sky-lit walls, lost cursors, camera cuts in close then pulls back to the whole maze.
export const Act3Maze: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { width, height, u } = useLayout();
  const seed = `seed-${spec.slug}`;

  // Two close shots (hard cuts), then one long eased pull-back.
  const zoom =
    frame < 75
      ? interpolate(frame, [0, 75], [3.2, 3.0])
      : frame < 150
        ? interpolate(frame, [75, 150], [2.2, 2.05])
        : interpolate(frame, [150, 285], [2.05, 0.95], {
            easing: Easing.inOut(Easing.cubic),
            extrapolateRight: "clamp",
          });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <GlowPlate frame={frame} seed={`${seed}-maze`} strength={0.6} />
      <IsoMaze
        width={width}
        height={height}
        frame={frame}
        seed={seed}
        cells={10}
        zoom={zoom}
        cursors={7}
        cursorSize={u * 4.5}
      />
    </AbsoluteFill>
  );
};
