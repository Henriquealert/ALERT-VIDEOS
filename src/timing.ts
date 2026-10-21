// Act boundaries in frames at 30 fps (~60 s). See CLAUDE.md "Structure".
export const FPS = 30;

export const ACTS = {
  title: { from: 0, duration: 5 * FPS },
  chaos: { from: 5 * FPS, duration: 15 * FPS },
  maze: { from: 20 * FPS, duration: 10 * FPS },
  calm: { from: 30 * FPS, duration: 20 * FPS },
  close: { from: 50 * FPS, duration: 10 * FPS },
} as const;

export const TOTAL_FRAMES = ACTS.close.from + ACTS.close.duration;

// Length of the stat beat at the end of act 2 (dropped when spec.stat is null).
export const STAT_BEAT = 3 * FPS;
