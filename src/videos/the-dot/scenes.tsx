import { interpolate } from "remotion";
import { BRAND_EASE } from "../../dot/keyframes";
import { C, F } from "../../ui/theme";
import { Logo } from "./assets";
import { HEADLINE_LH, HEADLINE_LS, LABEL_LS, METRICS, baselineIn, type Geometry } from "./geometry";
import type { TheDotProps } from "./schema";
import { T } from "./timeline";

// Scene layers for "The Dot". Each gets the absolute frame; the dot itself lives in src/dot/.
// No gradients, no shadows, no glows: solid fills and 1px hairlines only.

type SceneProps = { g: Geometry; p: TheDotProps; frame: number };
type Pt = { x: number; y: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number) => BRAND_EASE(interpolate(f, [a, b], [0, 1], clamp));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpPt = (a: Pt, b: Pt, t: number): Pt => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });

// Single line of text placed by its baseline.
const Line: React.FC<{
  text: string;
  left: number;
  baseline: number;
  size: number;
  weight: 400 | 700;
  color: string;
  lh?: number;
  ls?: string;
  align?: "left" | "center";
  style?: React.CSSProperties;
}> = ({ text, left, baseline, size, weight, color, lh = 1, ls, align = "left", style }) => (
  <div
    style={{
      position: "absolute",
      left,
      top: baseline - baselineIn(size, lh),
      transform: align === "center" ? "translateX(-50%)" : undefined,
      fontFamily: F.sans,
      fontWeight: weight,
      fontSize: size,
      lineHeight: lh,
      letterSpacing: ls,
      color,
      whiteSpace: "pre",
      ...style,
    }}
  >
    {text}
  </div>
);

// Outline card (ivory on ink/blue) or routed card (lime with ink text).
const Card: React.FC<{ g: Geometry; text: string; at: Pt; w: number; lime?: boolean; scale?: number; opacity?: number }> = ({
  g,
  text,
  at,
  w,
  lime,
  scale = 1,
  opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: at.x - w / 2,
      top: at.y - g.cardH / 2,
      width: w,
      height: g.cardH,
      boxSizing: "border-box",
      border: `1px solid ${lime ? C.lime : C.ivory}`,
      background: lime ? C.lime : "transparent",
      borderRadius: 12,
      color: lime ? C.ink : C.ivory,
      fontFamily: F.sans,
      fontWeight: 400,
      fontSize: g.fsCard,
      lineHeight: 1,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      whiteSpace: "pre",
      transform: `scale(${scale})`,
      opacity,
    }}
  >
    {text}
  </div>
);

const Hairlines: React.FC<{ g: Geometry; lines: { a: Pt; b: Pt; o?: number }[]; color: string; opacity?: number }> = ({
  g,
  lines,
  color,
  opacity = 1,
}) => (
  <svg width={g.W} height={g.H} style={{ position: "absolute", inset: 0, opacity }}>
    {lines.map((l, i) => (
      <line key={i} x1={l.a.x} y1={l.a.y} x2={l.b.x} y2={l.b.y} stroke={color} strokeWidth={1} opacity={l.o ?? 1} />
    ))}
  </svg>
);

// One line of copy for scenes 3-5: DM Sans Bold, sentence case, top-left; fades in, holds to the cut.
export const SceneLine: React.FC<SceneProps & { id: "s3" | "s4" | "s5"; at: number; color: string }> = ({ g, frame, id, at, color }) => {
  const t = ease(frame, at, at + T.lineIn);
  return (
    <>
      {g.sceneLines[id].map((l, j) => (
        <Line
          key={j}
          text={l.text}
          left={g.margin}
          baseline={l.baseline + (1 - t) * 1.2 * g.u}
          size={g.fsLine}
          weight={700}
          color={color}
          lh={g.lineLH}
          ls={HEADLINE_LS}
          style={{ opacity: t }}
        />
      ))}
    </>
  );
};

// ---------- S2: the request line, typed ----------
export const S2Type: React.FC<SceneProps> = ({ g, p, frame }) => {
  const n = Math.max(0, Math.min(p.requestLine.length, Math.floor((frame - T.typeStart) / T.framesPerChar)));
  return <Line text={p.requestLine.slice(0, n)} left={g.reqLeft} baseline={g.reqBaseline} size={g.fsReq} weight={400} color={C.ivory} />;
};

// ---------- S3: the line breaks into cards; the dot pulls them into a routing map ----------
// Card i position during S3 (also the start of S4).
const s3CardPos = (g: Geometry, i: number, frame: number): Pt => {
  const born: Pt = { x: g.wordCentres[i % g.wordCentres.length], y: g.reqBaseline - (METRICS.cap * g.fsReq) / 2 };
  const drift = ease(frame, T.s3Drift[0] + i * 2, T.s3Drift[1]);
  const pullAt = T.s3PullStart + i * T.s3PullEvery + T.s3LineDraw;
  const pull = ease(frame, pullAt, pullAt + T.s3PullDur);
  const slot = { x: g.cardSlot[i].cx, y: g.cardSlot[i].cy };
  return lerpPt(lerpPt(born, g.cardScatter[i], drift), slot, pull);
};

export const S3Break: React.FC<SceneProps> = ({ g, p, frame }) => {
  const words = p.requestLine.split(" ");
  const brk = ease(frame, T.s3Break[0], T.s3Break[1]);
  const wordEls = words.map((w, i) => ({ w, left: g.wordCentres[i], i }));
  const lines = p.cards.map((_, i) => {
    const s = T.s3PullStart + i * T.s3PullEvery;
    const draw = ease(frame, s, s + T.s3LineDraw);
    const c = s3CardPos(g, i, frame);
    const anchor = g.cardAnchor(c, g.cardW[i]);
    return { a: g.hub, b: lerpPt(g.hub, anchor, draw), o: draw > 0 ? 1 : 0 };
  });
  return (
    <>
      {/* The sentence lets go: words drift apart and fade as the cards take their place. */}
      {wordEls.map(({ w, left, i }) => (
        <Line
          key={i}
          text={w}
          left={left + (i - (words.length - 1) / 2) * brk * 2 * g.u}
          baseline={g.reqBaseline - brk * 1.5 * g.u}
          size={g.fsReq}
          weight={400}
          color={C.ivory}
          align="center"
          style={{ opacity: 1 - brk }}
        />
      ))}
      <Hairlines g={g} lines={lines} color={C.line} />
      {p.cards.map((c, i) => {
        const appear = ease(frame, T.s3Break[0] + 4 + i * 2, T.s3Break[0] + 14 + i * 2);
        return <Card key={i} g={g} text={c} at={s3CardPos(g, i, frame)} w={g.cardW[i]} scale={0.92 + 0.08 * appear} opacity={appear} />;
      })}
    </>
  );
};

// ---------- S4: hub and routing (on blue) ----------
export const S4Route: React.FC<SceneProps> = ({ g, p, frame }) => {
  const flow = ease(frame, T.s4FlowIn[0], T.s4FlowIn[1]);
  const mono = ease(frame, T.s4ToMono[0], T.s4ToMono[1]) * (1 - ease(frame, T.s4ToDot[0], T.s4ToDot[1]));
  const destIn = ease(frame, T.s4Dest[0], T.s4Dest[1]);

  // Inbound: the map's cards flow into the dot.
  const inbound = p.cards.map((_, i) => {
    const slot = { x: g.cardSlot[i].cx, y: g.cardSlot[i].cy };
    return { at: lerpPt(slot, g.hub, flow), slot };
  });
  const inLines = inbound.map(({ at }, i) => ({ a: g.hub, b: g.cardAnchor(at, g.cardW[i] * (1 - 0.7 * flow)) }));

  // Outbound: hub -> each destination.
  const outLines = p.destinations.map((_, i) => {
    const end = g.destText[i].anchor;
    return { a: g.fromHub(end), b: lerpPt(g.fromHub(end), end, destIn) };
  });
  const slide = (1 - destIn) * 1.5 * g.u;

  return (
    <>
      <Hairlines g={g} lines={inLines} color={C.ivory} opacity={0.4 * (1 - flow)} />
      <Hairlines g={g} lines={outLines} color={C.ivory} opacity={0.4 * (destIn > 0 ? 1 : 0)} />
      {inbound.map(({ at }, i) =>
        flow < 1 ? <Card key={i} g={g} text={p.cards[i]} at={at} w={g.cardW[i]} scale={1 - 0.7 * flow} opacity={1 - flow} /> : null,
      )}
      {/* Destination labels: ivory, then lime once their card arrives. */}
      {p.destinations.map((d, i) => {
        const arrive = T.s4RouteStart + i * T.s4RouteEvery + T.s4Travel;
        const t = g.destText[i];
        return (
          <Line
            key={i}
            text={d}
            left={t.left + (g.portrait ? 0 : slide)}
            baseline={t.baseline + (g.portrait ? slide : 0)}
            size={g.fsCard}
            weight={400}
            color={frame >= arrive - 2 ? C.lime : C.ivory}
            style={{ opacity: destIn }}
          />
        );
      })}
      {/* Routed cards: lime, one at a time, hub -> destination along the hairline. */}
      {p.cards.map((c, i) => {
        const r = T.s4RouteStart + i * T.s4RouteEvery;
        if (frame < r || frame > r + T.s4Travel + 1) return null;
        const t = ease(frame, r, r + T.s4Travel);
        const out = interpolate(frame, [r + T.s4Travel - 4, r + T.s4Travel], [1, 0], clamp);
        return (
          <Card
            key={i}
            g={g}
            text={c}
            lime
            at={lerpPt(g.hub, g.destText[i].centre, t)}
            w={g.cardW[i]}
            scale={0.4 + 0.6 * Math.min(1, t * 1.6)}
            opacity={out}
          />
        );
      })}
      {/* The hub: Ivory a! monogram, crossfaded with the dot. */}
      {mono > 0 ? (
        <div
          style={{
            position: "absolute",
            left: g.hub.x,
            top: g.hub.y,
            transform: `translate(-50%, -50%) scale(${0.92 + 0.08 * mono})`,
            opacity: mono,
          }}
        >
          <Logo kind="monogram" height={g.monoH} />
        </div>
      ) : null}
    </>
  );
};

// ---------- S5: steps on ivory ----------
export const S5Steps: React.FC<SceneProps> = ({ g, p, frame }) => {
  const arrived = p.steps.map((_, i) => T.s5FirstLand + i * T.s5HopEvery);
  let current = -1;
  arrived.forEach((a, i) => {
    if (frame >= a) current = i;
  });
  const badgeIn = ease(frame, T.s5Badge[0], T.s5Badge[1]);
  const head = 1.1 * g.u;
  return (
    <>
      <svg width={g.W} height={g.H} style={{ position: "absolute", inset: 0 }}>
        {g.arrows.map((a, i) => {
          const o = ease(frame, 392 + i * 2, 400 + i * 2);
          const dx = a.to.x - a.from.x;
          const dy = a.to.y - a.from.y;
          const len = Math.hypot(dx, dy) || 1;
          const ux = dx / len;
          const uy = dy / len;
          const hx = a.to.x - ux * head;
          const hy = a.to.y - uy * head;
          return (
            <g key={i} stroke={C.ink} strokeWidth={1.5} fill="none" opacity={o}>
              <line x1={a.from.x} y1={a.from.y} x2={a.to.x} y2={a.to.y} />
              <polyline points={`${hx - uy * head * 0.7},${hy + ux * head * 0.7} ${a.to.x},${a.to.y} ${hx + uy * head * 0.7},${hy - ux * head * 0.7}`} />
            </g>
          );
        })}
      </svg>
      {p.steps.map((s, i) => {
        const st = g.steps[i];
        const on = i === current;
        return (
          <Line
            key={i}
            text={s}
            left={st.left}
            baseline={st.baseline}
            size={g.fsStep}
            weight={on ? 700 : 400}
            color={on ? C.blue : C.ink}
            align={st.align}
            style={{ opacity: ease(frame, 390 + i * 2, 398 + i * 2) }}
          />
        );
      })}
      <div
        style={{
          position: "absolute",
          left: g.badge.left,
          top: g.badge.bottom - g.badge.fs * 2.4,
          height: g.badge.fs * 2.4,
          padding: `0 ${g.badge.fs * 1.1}px`,
          boxSizing: "border-box",
          border: `1px solid ${C.ink}`,
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          fontFamily: F.sans,
          fontWeight: 700,
          fontSize: g.badge.fs,
          letterSpacing: LABEL_LS,
          textTransform: "uppercase",
          color: C.ink,
          whiteSpace: "pre",
          opacity: badgeIn,
        }}
      >
        {p.languages}
      </div>
    </>
  );
};

// ---------- S6: the headline, waiting for its full stop (on lime) ----------
export const S6Headline: React.FC<SceneProps> = ({ g }) => (
  <>
    {g.headLines.map((l, j) => (
      <Line
        key={j}
        text={l}
        left={g.headLeft}
        baseline={g.headBaselines[j]}
        size={g.fsHead}
        weight={700}
        color={C.ink}
        lh={HEADLINE_LH}
        ls={HEADLINE_LS}
      />
    ))}
  </>
);

// ---------- S7: end card (on ink) ----------
export const S7End: React.FC<SceneProps> = ({ g, p, frame }) => {
  const line = ease(frame, T.s7Line[0], T.s7Line[1]);
  const cta = ease(frame, T.s7Cta[0], T.s7Cta[1]);
  return (
    <>
      <div style={{ position: "absolute", left: g.wordmark.left, top: g.wordmark.top }}>
        <Logo kind="wordmark" height={g.wordmark.width / (1214 / 458)} />
      </div>
      {g.brandLines.map((l, j) => (
        <Line
          key={j}
          text={l}
          left={g.margin}
          baseline={g.brandBaselines[j] + (1 - line) * 1.5 * g.u}
          size={g.fsBrand}
          weight={700}
          color={C.ivory}
          lh={g.brandLH}
          ls={HEADLINE_LS}
          style={{ opacity: line }}
        />
      ))}
      <div
        style={{
          position: "absolute",
          left: g.margin,
          top: g.ctaTop + (1 - cta) * 1 * g.u,
          fontFamily: F.sans,
          fontWeight: 700,
          fontSize: g.fsCta,
          letterSpacing: LABEL_LS,
          textTransform: "uppercase",
          color: C.mutedDark,
          whiteSpace: "pre",
          opacity: cta,
        }}
      >
        {p.cta}
      </div>
    </>
  );
};
