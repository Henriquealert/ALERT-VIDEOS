import { Easing, interpolate, spring, type SpringConfig } from "remotion";
import { C } from "../ui/theme";
import type { Geometry } from "../videos/the-dot/geometry";
import { FPS, SCENES, T, sceneAt, type Ground } from "../videos/the-dot/timeline";

// The dot's whole path, S1 to S7, in one table. Tune it here.
// Each key says where the dot is at frame `f`; `ease` shapes the move INTO that key
// from the previous one ("hold" = stay put, then jump on the key frame).
// `arc` lifts the move sideways at its midpoint (the hops in S5).

type Pt = { x: number; y: number };
export type Ease = "hold" | "linear" | "brand" | "in" | { spring: Partial<SpringConfig> };
export type DotKey = { f: number; x: number; y: number; d: number; o?: number; ease?: Ease; arc?: Pt };
export type DotState = { x: number; y: number; d: number; o: number; color: string };

// Brand motion curve for every eased move.
export const BRAND_EASE = Easing.bezier(0.2, 0, 0, 1);

// S6 fall: spring with damping 12. Stiffness is low enough that the one bounce is a small dip.
export const FALL_SPRING: Partial<SpringConfig> = { damping: 12, stiffness: 65, mass: 1 };
// Frames from the start of the fall until the dot first touches the baseline.
export const FALL_CONTACT = (() => {
  for (let t = 0; t < 120; t++) if (spring({ frame: t, fps: FPS, config: FALL_SPRING }) >= 1) return t;
  return 30;
})();
export const FALL_START = T.s6Land - FALL_CONTACT;

// Dot colour by ground: lime on ink or blue, blue on ivory, ink on lime.
export const DOT_COLOUR: Record<Ground, string> = { ink: C.lime, blue: C.lime, ivory: C.blue, lime: C.ink };
export const dotColourAt = (frame: number) => DOT_COLOUR[SCENES[sceneAt(frame)].ground];

export const buildKeyframes = (g: Geometry, p: { requestLine: string; cards: string[]; steps: string[] }): DotKey[] => {
  const k: DotKey[] = [];
  const at = (f: number, pt: Pt, d: number, rest: Partial<DotKey> = {}) => k.push({ f, x: pt.x, y: pt.y, d, ...rest });
  const centre = { x: g.cx, y: g.cy };
  const c = g.dotC;

  // S1 0-60: centre screen, blinking on 15 / off 15.
  for (let f = 0; f < SCENES.s1.to; f += T.blinkOn) {
    at(f, centre, c, { o: (f / T.blinkOn) % 2 === 0 ? 1 : 0, ease: "hold" });
  }

  // S2 60-150: slide to the start of the line, then sit after each typed character.
  at(T.s2Move[0], centre, c, { o: 1, ease: "hold" });
  at(T.s2Move[1], g.typedDot(0), c, { ease: "brand" });
  const N = p.requestLine.length;
  for (let n = 1; n <= N; n++) at(T.typeStart + T.framesPerChar * n, g.typedDot(n), c, { ease: "hold" });

  // S3 150-270: to the hub at screen centre, with a small tug as each card is pulled in.
  at(T.s3DotToHub[0], g.typedDot(N), c, { ease: "hold" });
  at(T.s3DotToHub[1], g.hub, c, { ease: "brand" });
  p.cards.forEach((_, i) => {
    const s = T.s3PullStart + i * T.s3PullEvery + T.s3LineDraw;
    at(s, g.hub, c, { ease: "hold" });
    at(s + 4, g.hub, c * 1.3, { ease: "brand" });
    at(s + 13, g.hub, c, { ease: "brand" });
  });

  // S4 270-390: grow into the hub, hide while the monogram shows, come back lime and shrink.
  at(T.s4Grow[0], g.hub, c, { ease: "hold" });
  at(T.s4Grow[1], g.hub, g.dotHub, { ease: "brand" });
  at(T.s4ToMono[0], g.hub, g.dotHub, { ease: "hold" });
  at(T.s4ToMono[1], g.hub, g.dotHub, { o: 0, ease: "linear" });
  at(T.s4ToDot[0], g.hub, g.dotHub, { o: 0, ease: "hold" });
  at(T.s4ToDot[1], g.hub, g.dotHub, { o: 1, ease: "linear" });
  at(T.s4Shrink[1], g.hub, c, { ease: "brand" });

  // S5 390-510: hop step to step on a small arc, then jump out of the top of the frame.
  p.steps.forEach((_, i) => {
    const land = T.s5FirstLand + i * T.s5HopEvery;
    at(i === 0 ? SCENES.s5.from : land - T.s5Hop, i === 0 ? g.hub : g.stepDot(i - 1), c, { ease: "hold" });
    at(land, g.stepDot(i), c, { ease: "brand", arc: g.hopArc });
  });
  const last = g.stepDot(p.steps.length - 1);
  at(T.s5Exit[0], last, c, { ease: "hold" });
  at(T.s5Exit[1], { x: last.x, y: -c * 2 }, c, { ease: "in" });

  // S6 510-630: wait above the frame, then fall onto the full stop (spring), growing smaller as it lands.
  const above = { x: g.landAt.x, y: -g.dotLand * 3 };
  at(SCENES.s6.from, above, g.dotLand * 2.4, { ease: "hold" });
  at(FALL_START, above, g.dotLand * 2.4, { ease: "hold" });
  at(FALL_START + 60, g.landAt, g.dotLand, { ease: { spring: FALL_SPRING } });

  // S7 630-720: glide to the end of the brand line, then one last blink.
  at(T.s7Glide[0], g.landAt, g.dotLand, { ease: "hold" });
  at(T.s7Glide[1], g.brandStop, g.dotBrand, { ease: "brand" });
  at(T.s7BlinkOff, g.brandStop, g.dotBrand, { o: 0, ease: "hold" });
  at(T.s7BlinkOn, g.brandStop, g.dotBrand, { o: 1, ease: "hold" });

  // Opacity carries over from the previous key unless a key sets it.
  let o = 1;
  for (const key of k) {
    if (key.o === undefined) key.o = o;
    o = key.o;
  }
  return k.sort((a, b) => a.f - b.f);
};

const progress = (ease: Ease, f: number, f0: number, f1: number): number => {
  if (ease === "hold") return f >= f1 ? 1 : 0;
  if (typeof ease === "object") return spring({ frame: f - f0, fps: FPS, config: ease.spring });
  const t = interpolate(f, [f0, f1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (ease === "brand") return BRAND_EASE(t);
  if (ease === "in") return Easing.in(Easing.quad)(t);
  return t;
};

export const dotAt = (keys: DotKey[], frame: number): DotState => {
  const color = dotColourAt(frame);
  const i = keys.findIndex((key) => key.f > frame);
  if (i === -1 || i === 0) {
    const z = keys[i === 0 ? 0 : keys.length - 1];
    return { x: z.x, y: z.y, d: z.d, o: z.o ?? 1, color };
  }
  const a = keys[i - 1];
  const b = keys[i];
  const e = b.ease ?? "linear";
  const t = progress(e, frame, a.f, b.f);
  const lift = b.arc ? Math.sin(Math.PI * Math.min(1, Math.max(0, t))) : 0;
  const tc = Math.min(1, Math.max(0, t));
  return {
    x: a.x + (b.x - a.x) * t + (b.arc?.x ?? 0) * lift,
    y: a.y + (b.y - a.y) * t + (b.arc?.y ?? 0) * lift,
    d: Math.max(0, a.d + (b.d - a.d) * t),
    o: (a.o ?? 1) + ((b.o ?? 1) - (a.o ?? 1)) * tc,
    color,
  };
};
