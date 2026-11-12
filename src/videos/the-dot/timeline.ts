// "The Dot": scene timeline at 30 fps, 720 frames (24 s).
// Plain data, no React: read by the video, src/dot/keyframes.ts and scripts/generate-vo.ts.

export const FPS = 30;
export const DURATION = 720;

export type Ground = "ink" | "blue" | "ivory" | "lime";
export type SceneId = "s1" | "s2" | "s3" | "s4" | "s5" | "s6" | "s7";

// Grounds change on hard cuts at each scene's first frame.
export const SCENES: Record<SceneId, { from: number; to: number; ground: Ground }> = {
  s1: { from: 0, to: 60, ground: "ink" },
  s2: { from: 60, to: 150, ground: "ink" },
  s3: { from: 150, to: 270, ground: "ink" },
  s4: { from: 270, to: 390, ground: "blue" },
  s5: { from: 390, to: 510, ground: "ivory" },
  s6: { from: 510, to: 630, ground: "lime" },
  s7: { from: 630, to: 720, ground: "ink" },
};
export const SCENE_ORDER: SceneId[] = ["s1", "s2", "s3", "s4", "s5", "s6", "s7"];

export const sceneAt = (frame: number): SceneId => {
  for (const id of SCENE_ORDER) if (frame < SCENES[id].to) return id;
  return "s7";
};

// Beats inside the scenes (absolute frames). Tune timing here.
export const T = {
  // S1: cursor blink, on 15 / off 15. A tick plays on each blink-on.
  blinkPeriod: 30,
  blinkOn: 15,
  // S2: slide to the line start, then type ~2 frames per character.
  s2Move: [60, 68] as const,
  typeStart: 68,
  framesPerChar: 2,
  // S3: the line breaks into cards, cards drift out, the dot pulls each one in.
  s3Break: [150, 162] as const,
  s3DotToHub: [152, 168] as const,
  s3Drift: [154, 186] as const,
  s3PullStart: 188, // first card; then every s3PullEvery
  s3PullEvery: 18,
  s3LineDraw: 7,
  s3PullDur: 14,
  // S4: cards flow into the dot, dot becomes the monogram hub, cards route one at a time.
  s4FlowIn: [270, 282] as const,
  s4Grow: [271, 283] as const,
  s4ToMono: [283, 295] as const, // ~12-frame crossfade dot -> monogram
  s4Dest: [284, 296] as const,
  s4RouteStart: 296,
  s4RouteEvery: 20,
  s4Travel: 14,
  s4ToDot: [372, 381] as const, // monogram -> dot (lime)
  s4Shrink: [381, 389] as const,
  // S5: dot hops step to step (~22 frames each), then jumps out of the top of the frame.
  s5FirstLand: 400,
  s5HopEvery: 22,
  s5Hop: 12,
  s5Exit: [496, 509] as const,
  s5Badge: [404, 416] as const,
  // S6: the dot falls in and lands as the headline's full stop (spring, damping 12).
  s6Land: 566, // first contact; land.wav plays here, vo-s6 starts at 572
  // S7: end card.
  s7Glide: [631, 646] as const,
  s7Line: [636, 652] as const,
  s7Cta: [652, 664] as const,
  s7BlinkOff: 705, // last 15 frames: off 705-712, on 713-719
  s7BlinkOn: 713,
};

// Cursor blink-on frames: a tick plays on each one.
export const TICK_FRAMES: number[] = [0, 30, T.s7BlinkOn];
