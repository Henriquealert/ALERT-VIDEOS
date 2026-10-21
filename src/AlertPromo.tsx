import { AbsoluteFill, Sequence } from "remotion";
import { Act1Title } from "./acts/Act1Title";
import { Act2Chaos } from "./acts/Act2Chaos";
import { Act3Maze } from "./acts/Act3Maze";
import { Act4Calm } from "./acts/Act4Calm";
import { Act5Close } from "./acts/Act5Close";
import type { VideoSpec } from "./spec";
import { ACTS } from "./timing";
import { C } from "./ui/theme";

// One spec drives every format. Acts are hard cuts, no transitions.
export const AlertPromo: React.FC<VideoSpec> = (spec) => (
  <AbsoluteFill style={{ background: C.ink }}>
    <Sequence name="1 Title" from={ACTS.title.from} durationInFrames={ACTS.title.duration}>
      <Act1Title spec={spec} />
    </Sequence>
    <Sequence name="2 Chaos" from={ACTS.chaos.from} durationInFrames={ACTS.chaos.duration}>
      <Act2Chaos spec={spec} />
    </Sequence>
    <Sequence name="3 Maze" from={ACTS.maze.from} durationInFrames={ACTS.maze.duration}>
      <Act3Maze spec={spec} />
    </Sequence>
    <Sequence name="4 Calm" from={ACTS.calm.from} durationInFrames={ACTS.calm.duration}>
      <Act4Calm spec={spec} />
    </Sequence>
    <Sequence name="5 Close" from={ACTS.close.from} durationInFrames={ACTS.close.duration}>
      <Act5Close spec={spec} />
    </Sequence>
  </AbsoluteFill>
);
