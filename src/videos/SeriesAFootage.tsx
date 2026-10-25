import { AbsoluteFill, Easing, interpolate, random, useVideoConfig } from "remotion";

// CG "footage" for "Series A, sorted." (src/videos/SeriesASorted.tsx).
// Every shot is drawn in greyscale light (0 = black, 1 = white) and graded into the brand's blue
// duotone by the <DuotoneFilter> (Deep Ink shadows, Electric Blue mid-tones, light sky highlights).
// No people, no logos, no legible text, no landmarks: objects, places and light only.
// Each shot takes its local frame `f` and moves its own camera.

export type ShotProps = { f: number; variant?: number };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const g = (v: number, a = 1) => {
  const c = Math.round(Math.max(0, Math.min(1, v)) * 255);
  return a === 1 ? `rgb(${c},${c},${c})` : `rgba(${c},${c},${c},${a})`;
};
const ease = (f: number, a: number, b: number, easing = Easing.inOut(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing });

const useL = () => {
  const { width: W, height: H } = useVideoConfig();
  return { W, H, u: Math.min(W, H) / 100, wide: W > H };
};

// ---------- Grade ----------

// Luminance -> Ink (#101B32) / Electric Blue (#1644B8) / light sky (#9DBDF5) / #E2ECFA.
// Brand gradient stops only (src/ui/theme.tsx); lime never enters the grade.
export const DUOTONE = "sa-duotone";
export const DuotoneFilter: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id={DUOTONE} colorInterpolationFilters="sRGB">
      <feColorMatrix
        type="matrix"
        values="0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0.2126 0.7152 0.0722 0 0  0 0 0 1 0"
      />
      <feComponentTransfer>
        <feFuncR type="table" tableValues="0.063 0.086 0.616 0.886" />
        <feFuncG type="table" tableValues="0.106 0.267 0.741 0.925" />
        <feFuncB type="table" tableValues="0.196 0.722 0.961 0.980" />
      </feComponentTransfer>
    </filter>
  </svg>
);

// Graded plate: everything inside is footage.
export const Plate: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <AbsoluteFill style={{ background: "#000", overflow: "hidden", filter: `url(#${DUOTONE})`, ...style }}>{children}</AbsoluteFill>
);

// Soft out-of-focus discs drifting in front of a shot.
const Bokeh: React.FC<{ f: number; seed: string; n: number; light?: number; size?: number }> = ({ f, seed, n, light = 0.9, size = 1 }) => {
  const { W, H, u } = useL();
  return (
    <>
      {Array.from({ length: n }, (_, i) => {
        const r = (6 + 14 * random(`${seed}-r${i}`)) * u * size;
        const x = random(`${seed}-x${i}`) * W + f * (0.4 + random(`${seed}-v${i}`)) * u * 0.3;
        const y = random(`${seed}-y${i}`) * H;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: (x % (W + 2 * r)) - r,
              top: y - r,
              width: 2 * r,
              height: 2 * r,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${g(light, 0.5)} 0%, ${g(light, 0.35)} 55%, ${g(light, 0)} 72%)`,
              filter: `blur(${0.6 * u}px)`,
            }}
          />
        );
      })}
    </>
  );
};

// ---------- Laptop lid opening (scene 1) ----------

export const LaptopLid: React.FC<ShotProps> = ({ f }) => {
  const { W, H, u } = useL();
  const lw = Math.min(W * 0.9, H * 1.05);
  const depth = lw * 0.62;
  const open = ease(f, 2, 24, Easing.out(Easing.cubic));
  const lid = -92 + 102 * open; // degrees: closed flat on the deck, opens to lean back 10 deg
  const glow = ease(f, 6, 26);
  const push = interpolate(f, [0, 40], [1.08, 1.0], { ...clamp, easing: Easing.out(Easing.quad) });
  const keys = 15;
  return (
    <Plate>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 30%, ${g(0.12 + 0.18 * glow)} 0%, ${g(0)} 70%)` }} />
      <AbsoluteFill style={{ perspective: lw * 1.1, perspectiveOrigin: "50% 20%", transform: `scale(${push})` }}>
        <div
          style={{
            position: "absolute",
            left: W / 2 - lw / 2,
            top: H * 0.8,
            width: lw,
            height: 0,
            transformStyle: "preserve-3d",
            transform: `translateZ(${-depth * 0.2}px) rotateX(-14deg)`,
          }}
        >
          {/* Deck */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: -depth / 2,
              width: lw,
              height: depth,
              transform: "rotateX(90deg)",
              background: `linear-gradient(180deg, ${g(0.2 + 0.25 * glow)} 0%, ${g(0.08)} 100%)`,
              borderRadius: lw * 0.02,
              display: "grid",
              gridTemplateColumns: `repeat(${keys}, 1fr)`,
              gap: lw * 0.006,
              padding: `${depth * 0.08}px ${lw * 0.06}px ${depth * 0.45}px`,
              boxSizing: "border-box",
            }}
          >
            {Array.from({ length: keys * 5 }, (_, i) => (
              <div key={i} style={{ background: g(0.04 + 0.1 * glow * (1 - Math.floor(i / keys) / 6)), borderRadius: lw * 0.003 }} />
            ))}
          </div>
          {/* Lid, hinged at the back edge of the deck */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: -depth,
              width: lw,
              height: depth,
              transformOrigin: "50% 100%",
              transformStyle: "preserve-3d",
              transform: `translateZ(${-depth / 2}px) rotateX(${lid}deg)`,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: lw * 0.02,
                background: g(0.06),
                border: `${lw * 0.012}px solid ${g(0.1)}`,
                boxSizing: "border-box",
                backfaceVisibility: "hidden",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "4%",
                  borderRadius: lw * 0.006,
                  background: `radial-gradient(ellipse at 50% 55%, ${g(0.35 + 0.65 * glow)} 0%, ${g(0.2 + 0.5 * glow)} 45%, ${g(0.1 + 0.25 * glow)} 100%)`,
                }}
              />
            </div>
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: lw * 0.02,
                background: `linear-gradient(160deg, ${g(0.3)} 0%, ${g(0.12)} 60%, ${g(0.05)} 100%)`,
                transform: "rotateY(180deg)",
                backfaceVisibility: "hidden",
              }}
            />
          </div>
        </div>
      </AbsoluteFill>
      {/* Spill from the screen */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(ellipse 60% 45% at 50% 42%, ${g(1, 0.5 * glow)} 0%, ${g(1, 0)} 70%)`,
          mixBlendMode: "screen",
        }}
      />
      <Bokeh f={f} seed="lid" n={6} light={0.7} />
    </Plate>
  );
};

// ---------- Glass architecture against the sky (scenes 1 and 7) ----------

// Bilinear point inside a quad [tl, tr, br, bl].
const quad = (q: number[][], s: number, t: number) => {
  const top = [q[0][0] + (q[1][0] - q[0][0]) * s, q[0][1] + (q[1][1] - q[0][1]) * s];
  const bot = [q[3][0] + (q[2][0] - q[3][0]) * s, q[3][1] + (q[2][1] - q[3][1]) * s];
  return [top[0] + (bot[0] - top[0]) * t, top[1] + (bot[1] - top[1]) * t];
};
const pts = (q: number[][]) => q.map((x) => x.join(",")).join(" ");

// One glass curtain wall: sky reflection gradient, a soft bright band sliding across, strong mullions, thin floor lines.
const Facade: React.FC<{ id: string; q: number[][]; cols: number; rows: number; tone: [number, number]; f: number; u: number }> = ({
  id,
  q,
  cols,
  rows,
  tone,
  f,
  u,
}) => {
  const [a, b] = tone;
  const top = quad(q, 0.5, 0);
  const bot = quad(q, 0.5, 1);
  const s = ((f * 0.006) % 1.6) - 0.3; // band position along the facade
  const band = [quad(q, s - 0.12, -0.2), quad(q, s + 0.05, -0.2), quad(q, s + 0.35, 1.2), quad(q, s + 0.18, 1.2)];
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-g`} gradientUnits="userSpaceOnUse" x1={top[0]} y1={top[1]} x2={bot[0]} y2={bot[1]}>
          <stop offset="0" stopColor={g(b)} />
          <stop offset="0.55" stopColor={g((a + b) / 2)} />
          <stop offset="1" stopColor={g(a)} />
        </linearGradient>
        <clipPath id={`${id}-c`}>
          <polygon points={pts(q)} />
        </clipPath>
        <filter id={`${id}-b`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={2.5 * u} />
        </filter>
      </defs>
      <polygon points={pts(q)} fill={`url(#${id}-g)`} />
      <g clipPath={`url(#${id}-c)`}>
        <polygon points={pts(band)} fill={g(1, 0.55)} filter={`url(#${id}-b)`} />
        {Array.from({ length: rows + 1 }, (_, r) => {
          const p0 = quad(q, 0, r / rows);
          const p1 = quad(q, 1, r / rows);
          return <line key={`r${r}`} x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke={g(0.06, 0.8)} strokeWidth={0.18 * u} />;
        })}
        {Array.from({ length: cols + 1 }, (_, c) => {
          const p0 = quad(q, c / cols, 0);
          const p1 = quad(q, c / cols, 1);
          return <line key={`c${c}`} x1={p0[0]} y1={p0[1]} x2={p1[0]} y2={p1[1]} stroke={g(c % 3 === 0 ? 0.92 : 0.04)} strokeWidth={(c % 3 === 0 ? 0.25 : 0.4) * u} />;
        })}
      </g>
    </g>
  );
};

export const GlassTower: React.FC<ShotProps> = ({ f, variant = 0 }) => {
  const { W, H, u } = useL();
  const L = Math.max(W, H);
  const rot = interpolate(f, [0, 140], [variant ? 5 : -4, variant ? 1.5 : -1]);
  const scale = interpolate(f, [0, 140], [1.14, 1.02], { ...clamp, easing: Easing.out(Easing.quad) });
  // Worm's-eye: a tower corner rising toward a vanishing point high above the frame, open sky around it.
  const cx = W * (variant ? 0.36 : 0.62);
  const vp = [cx + (variant ? 0.1 : -0.1) * W, -L * 1.4];
  const base = H + L * 0.08;
  const toward = (x: number, k: number) => [x + (vp[0] - x) * k, base + (vp[1] - base) * k];
  const k = 0.5;
  const lx = cx - L * 0.95;
  const rx = cx + L * 0.7;
  const qL = [toward(lx, k * 0.92), toward(cx, k), [cx, base], [lx, base]];
  const qR = [toward(cx, k), toward(rx, k * 0.86), [rx, base], [cx, base]];
  return (
    <Plate>
      <AbsoluteFill style={{ background: `linear-gradient(${variant ? 200 : 160}deg, ${g(0.72)} 0%, ${g(0.5)} 40%, ${g(0.36)} 100%)` }} />
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: ((random(`cl${i}`) * 1.2 - 0.1) * W + f * 0.12 * u) % (W * 1.3),
            top: random(`ct${i}`) * H * 0.3,
            width: (25 + 25 * random(`cw${i}`)) * u,
            height: (6 + 5 * random(`ch${i}`)) * u,
            borderRadius: "50%",
            background: g(0.9, 0.6),
            filter: `blur(${3 * u}px)`,
          }}
        />
      ))}
      <AbsoluteFill style={{ transform: `rotate(${rot}deg) scale(${scale})`, transformOrigin: "50% 100%" }}>
        <svg width={W} height={H} style={{ position: "absolute", inset: 0, overflow: "visible" }}>
          <Facade id={`tl${variant}`} q={qL} cols={18} rows={30} tone={[0.12, 0.42]} f={f} u={u} />
          <Facade id={`tr${variant}`} q={qR} cols={14} rows={30} tone={[0.3, 0.7]} f={f + 60} u={u} />
          <line x1={qL[1][0]} y1={qL[1][1]} x2={cx} y2={base} stroke={g(1)} strokeWidth={0.4 * u} />
          <polyline points={pts([qL[0], qL[1], qR[1]])} fill="none" stroke={g(1)} strokeWidth={0.3 * u} />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at ${variant ? 82 : 22}% 6%, ${g(1, 0.85)} 0%, ${g(1, 0.25)} 16%, ${g(1, 0)} 38%)`,
          mixBlendMode: "screen",
        }}
      />
    </Plate>
  );
};

// ---------- Boxed laptops on a shelf (scene 2) ----------

export const BoxedLaptops: React.FC<ShotProps> = ({ f, variant = 0 }) => {
  const { W, H, u } = useL();
  const bw = (variant ? 30 : 22) * u;
  const bh = bw * 0.72;
  const dx = (variant ? -1 : 1) * f * 0.35 * u;
  const rows = Math.ceil(H / (bh * 1.35)) + 1;
  const cols = Math.ceil(W / (bw * 1.08)) + 3;
  const items: React.ReactNode[] = [];
  for (let r = 0; r < rows; r++) {
    const y = r * bh * 1.35 - bh * 0.4;
    items.push(<rect key={`s${r}`} x={-W} y={y + bh} width={W * 3} height={bh * 0.12} fill={g(0.22)} />);
    items.push(<rect key={`e${r}`} x={-W} y={y + bh} width={W * 3} height={bh * 0.02} fill={g(0.7)} />);
    for (let c = -2; c < cols; c++) {
      const x = c * bw * 1.08 + ((dx + (r % 2) * bw * 0.3) % (bw * 1.08));
      const lit = 0.32 + 0.25 * Math.exp(-(((x + bw / 2) / W - 0.5) ** 2) * 6) + 0.05 * random(`bx${r}-${c}`);
      const top = bh * 0.1;
      items.push(
        <g key={`${r}-${c}`}>
          <polygon points={`${x},${y + top} ${x + bw * 0.06},${y} ${x + bw * 1.0},${y} ${x + bw * 0.94},${y + top}`} fill={g(lit + 0.2)} />
          <rect x={x} y={y + top} width={bw * 0.94} height={bh - top} fill={g(lit)} />
          <rect x={x + bw * 0.42} y={y + top} width={bw * 0.1} height={bh - top} fill={g(lit + 0.12)} />
          <rect x={x + bw * 0.08} y={y + bh * 0.55} width={bw * 0.24} height={bh * 0.22} fill={g(lit + 0.28)} rx={2} />
          <rect x={x + bw * 0.94} y={y + top} width={bw * 0.06} height={bh - top} fill={g(lit * 0.55)} />
        </g>,
      );
    }
  }
  return (
    <Plate>
      <AbsoluteFill style={{ background: g(0.08) }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: `scale(${1.05 + f * 0.0015})` }}>
        {items}
      </svg>
      <AbsoluteFill style={{ background: `linear-gradient(90deg, ${g(0, 0.6)} 0%, ${g(0, 0)} 25%, ${g(0, 0)} 75%, ${g(0, 0.6)} 100%)` }} />
      <Bokeh f={f} seed={`box${variant}`} n={4} light={0.95} size={1.4} />
    </Plate>
  );
};

// ---------- Keyboard macro (scene 2) ----------

export const KeyboardMacro: React.FC<ShotProps> = ({ f, variant = 0 }) => {
  const { W, H, u } = useL();
  const size = Math.max(W, H) * 1.6;
  const cols = 16;
  const rows = 11;
  const sweep = ((f * 1.6 + variant * 40) % 140) / 140;
  const keys = (blur: number) => (
    <div
      style={{
        position: "absolute",
        left: W / 2 - size / 2,
        top: H / 2 - size / 2,
        width: size,
        height: size,
        transform: `rotateX(${variant ? 58 : 50}deg) rotateZ(${variant ? -18 : 12}deg) translateY(${-f * 0.5 * u}px)`,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap: size * 0.008,
        padding: size * 0.01,
        boxSizing: "border-box",
        background: g(0.03),
        filter: blur ? `blur(${blur}px)` : undefined,
      }}
    >
      {Array.from({ length: cols * rows }, (_, i) => {
        const c = i % cols;
        const r = Math.floor(i / cols);
        const hl = Math.exp(-(((c / cols + r / rows) / 2 - sweep) ** 2) * 60);
        return (
          <div
            key={i}
            style={{
              borderRadius: size * 0.006,
              background: `linear-gradient(160deg, ${g(0.34 + 0.5 * hl)} 0%, ${g(0.16 + 0.2 * hl)} 70%, ${g(0.08)} 100%)`,
              boxShadow: `inset 0 -${size * 0.004}px 0 ${g(0.04)}`,
            }}
          />
        );
      })}
    </div>
  );
  return (
    <Plate>
      <AbsoluteFill style={{ perspective: size * 0.6 }}>{keys(1.2 * u)}</AbsoluteFill>
      {/* Focus band: a sharp copy masked to a narrow plane */}
      <AbsoluteFill
        style={{
          perspective: size * 0.6,
          maskImage: "linear-gradient(180deg, transparent 30%, black 45%, black 58%, transparent 72%)",
          WebkitMaskImage: "linear-gradient(180deg, transparent 30%, black 45%, black 58%, transparent 72%)",
        }}
      >
        {keys(0)}
      </AbsoluteFill>
      <Bokeh f={f} seed={`kb${variant}`} n={3} light={0.8} />
    </Plate>
  );
};

// ---------- Server-rack LEDs (scene 2) ----------

export const ServerLeds: React.FC<ShotProps> = ({ f, variant = 0 }) => {
  const { W, H, u } = useL();
  const pw = Math.max(W, H) * 1.6;
  const ph = Math.max(W, H) * 1.1;
  const units = 22;
  const uh = ph / units;
  const leds: React.ReactNode[] = [];
  for (let r = 0; r < units; r++) {
    for (let c = 0; c < 18; c++) {
      const on = random(`led${variant}-${r}-${c}-${Math.floor((f + 7 * random(`p${r}${c}`)) / (3 + Math.floor(6 * random(`q${r}${c}`))))}`) > 0.45;
      const x = pw * 0.06 + c * pw * 0.05;
      leds.push(<circle key={`${r}-${c}`} cx={x} cy={r * uh + uh * 0.5} r={uh * 0.09} fill={g(on ? 1 : 0.18)} />);
    }
  }
  return (
    <Plate>
      <AbsoluteFill style={{ perspective: pw * 0.5 }}>
        <div
          style={{
            position: "absolute",
            left: W / 2 - pw * 0.42,
            top: H / 2 - ph / 2,
            width: pw,
            height: ph,
            transform: `rotateY(${variant ? 38 : -42}deg) translateX(${(variant ? -1 : 1) * f * 0.4 * u}px)`,
            background: `repeating-linear-gradient(180deg, ${g(0.1)} 0px, ${g(0.13)} ${uh * 0.9}px, ${g(0.02)} ${uh * 0.9}px, ${g(0.02)} ${uh}px)`,
          }}
        >
          <svg width={pw} height={ph} style={{ position: "absolute", inset: 0 }}>
            <defs>
              <filter id={`ledglow${variant}`} x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation={uh * 0.12} />
              </filter>
            </defs>
            <g filter={`url(#ledglow${variant})`}>{leds}</g>
            <g>{leds}</g>
          </svg>
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${g(0, 0)} 35%, ${g(0, 0.75)} 100%)` }} />
      <Bokeh f={f} seed={`srv${variant}`} n={5} light={1} size={0.8} />
    </Plate>
  );
};

// ---------- Fibre-optic light (scene 2, behind the capsule ring) ----------

export const FibreOptic: React.FC<ShotProps & { soft?: boolean }> = ({ f, variant = 0, soft }) => {
  const { W, H, u } = useL();
  const n = 46;
  const strands = Array.from({ length: n }, (_, i) => {
    const t = i / (n - 1);
    const sx = -W * 0.1;
    const sy = H * (0.75 + 0.2 * random(`fs${variant}${i}`));
    const ex = W * (0.55 + 0.6 * random(`fe${variant}${i}`));
    const ey = H * (-0.1 + 0.9 * t);
    const c1 = [W * 0.3, sy - H * 0.1];
    const c2 = [ex - W * 0.25, ey + H * 0.15 * (random(`fc${variant}${i}`) - 0.5)];
    return { d: `M${sx},${sy} C${c1[0]},${c1[1]} ${c2[0]},${c2[1]} ${ex},${ey}`, ex, ey, i };
  });
  const pulse = (i: number) => (f * (2.2 + random(`fp${i}`) * 2) + 400 * random(`fo${i}`)) % 400;
  return (
    <Plate>
      <AbsoluteFill style={{ background: g(0.02) }} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0, transform: `rotate(${variant ? 180 : 0}deg) scale(${1.05 + f * 0.001})` }}>
        <defs>
          <filter id={`fglow${variant}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={0.8 * u} />
          </filter>
        </defs>
        {strands.map((s) => (
          <path key={s.i} d={s.d} stroke={g(0.16)} strokeWidth={0.18 * u} fill="none" />
        ))}
        <g filter={`url(#fglow${variant})`}>
          {strands.map((s) => (
            <path key={s.i} d={s.d} pathLength={400} stroke={g(1)} strokeWidth={0.5 * u} fill="none" strokeDasharray="22 378" strokeDashoffset={-pulse(s.i)} />
          ))}
          {strands.map((s) => (
            <circle key={s.i} cx={s.ex} cy={s.ey} r={(0.6 + 0.6 * random(`ft${s.i}`)) * u} fill={g(1)} />
          ))}
        </g>
        {strands.map((s) => (
          <path key={s.i} d={s.d} pathLength={400} stroke={g(1)} strokeWidth={0.16 * u} fill="none" strokeDasharray="18 382" strokeDashoffset={-pulse(s.i)} />
        ))}
      </svg>
      <Bokeh f={f} seed={`fib${variant}`} n={soft ? 10 : 6} light={1} size={soft ? 1.5 : 1} />
      {soft ? <AbsoluteFill style={{ backdropFilter: `blur(${0.8 * u}px)` }} /> : null}
    </Plate>
  );
};

// ---------- Data-centre corridor (scene 3) ----------

const RackWall: React.FC<{ len: number; h: number; seed: string; f: number }> = ({ len, h, seed, f }) => {
  const rackW = h * 0.42;
  const n = Math.ceil(len / rackW);
  const uh = h / 30;
  return (
    <svg width={len} height={h} style={{ position: "absolute", inset: 0 }}>
      {Array.from({ length: n }, (_, i) => (
        <g key={i}>
          <rect x={i * rackW + rackW * 0.03} y={h * 0.04} width={rackW * 0.94} height={h * 0.96} fill={g(0.1)} />
          {Array.from({ length: 26 }, (_, r) => {
            const on = random(`${seed}-${i}-${r}-${Math.floor((f + i * 3 + r) / 5)}`) > 0.5;
            return (
              <g key={r}>
                <rect x={i * rackW + rackW * 0.08} y={h * 0.07 + r * uh * 1.08} width={rackW * 0.84} height={uh * 0.8} fill={g(0.14)} />
                <rect x={i * rackW + rackW * 0.12} y={h * 0.07 + r * uh * 1.08 + uh * 0.3} width={rackW * 0.06} height={uh * 0.2} fill={g(on ? 1 : 0.3)} />
                <rect x={i * rackW + rackW * 0.22} y={h * 0.07 + r * uh * 1.08 + uh * 0.3} width={rackW * 0.03} height={uh * 0.2} fill={g(random(`${seed}b${i}${r}`) > 0.6 ? 0.9 : 0.25)} />
              </g>
            );
          })}
        </g>
      ))}
    </svg>
  );
};

export const Corridor: React.FC<ShotProps> = ({ f }) => {
  const { W, H } = useL();
  const h = Math.max(W, H) * 0.9; // corridor height
  const w = h * 1.1; // corridor width
  const len = h * 9;
  const z = f * h * 0.025; // camera push
  const wall = (side: -1 | 1) => (
    <div
      style={{
        position: "absolute",
        left: -len / 2,
        top: -h / 2,
        width: len,
        height: h,
        transform: `translateX(${(side * w) / 2}px) translateZ(${-len / 2}px) rotateY(${side * 90}deg)`,
      }}
    >
      <RackWall len={len} h={h} seed={side > 0 ? "rw" : "lw"} f={f} />
    </div>
  );
  return (
    <Plate>
      <AbsoluteFill style={{ perspective: h * 0.75, perspectiveOrigin: "50% 48%" }}>
        <div
          style={{
            position: "absolute",
            left: W / 2,
            top: H / 2,
            transformStyle: "preserve-3d",
            transform: `translateZ(${z}px) rotateZ(${Math.sin(f / 40) * 0.6}deg)`,
          }}
        >
          {wall(-1)}
          {wall(1)}
          {/* Floor with reflections */}
          <div
            style={{
              position: "absolute",
              left: -w / 2,
              top: -len / 2,
              width: w,
              height: len,
              transform: `translateY(${h / 2}px) translateZ(${-len / 2}px) rotateX(90deg)`,
              background: `repeating-linear-gradient(0deg, ${g(0.12)} 0px, ${g(0.12)} ${w / 4 - 3}px, ${g(0.3)} ${w / 4 - 3}px, ${g(0.3)} ${w / 4}px), ${g(0.12)}`,
            }}
          />
          {/* Ceiling with light strips */}
          <div
            style={{
              position: "absolute",
              left: -w / 2,
              top: -len / 2,
              width: w,
              height: len,
              transform: `translateY(${-h / 2}px) translateZ(${-len / 2}px) rotateX(90deg)`,
              background: `repeating-linear-gradient(0deg, ${g(0.04)} 0px, ${g(0.04)} ${h * 0.5}px, ${g(1)} ${h * 0.5}px, ${g(1)} ${h * 0.56}px)`,
            }}
          />
        </div>
      </AbsoluteFill>
      {/* Light at the far end, haze toward it */}
      <AbsoluteFill style={{ background: `radial-gradient(ellipse 22% 30% at 50% 48%, ${g(1, 0.95)} 0%, ${g(0.7, 0.5)} 45%, ${g(0, 0)} 100%)` }} />
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 48%, ${g(0, 0)} 40%, ${g(0, 0.6)} 100%)` }} />
    </Plate>
  );
};

// ---------- Circuit board (scene 5) ----------

export const CircuitBoard: React.FC<ShotProps> = ({ f, variant = 0 }) => {
  const { W, H, u } = useL();
  const S = Math.max(W, H) * 1.3;
  const step = S / 46;
  const traces: { d: string; len: number }[] = [];
  for (let i = 0; i < 70; i++) {
    let x = Math.floor(random(`cx${variant}${i}`) * 46) * step;
    let y = Math.floor(random(`cy${variant}${i}`) * 46) * step;
    let d = `M${x},${y}`;
    let len = 0;
    let dir = Math.floor(random(`cd${variant}${i}`) * 4);
    for (let s = 0; s < 6; s++) {
      const l = (2 + Math.floor(random(`cl${variant}${i}${s}`) * 7)) * step;
      const diag = random(`cg${variant}${i}${s}`) > 0.6;
      const [dx, dy] = [
        [1, 0],
        [0, 1],
        [-1, 0],
        [0, -1],
      ][dir];
      const ox = diag ? (dy !== 0 ? 1 : 0) : 0;
      const oy = diag ? (dx !== 0 ? 1 : 0) : 0;
      x += (dx + ox) * l;
      y += (dy + oy) * l;
      len += l * (diag ? 1.414 : 1);
      d += ` L${x},${y}`;
      dir = (dir + (random(`ct${variant}${i}${s}`) > 0.5 ? 1 : 3)) % 4;
    }
    traces.push({ d, len });
  }
  const chips = Array.from({ length: 7 }, (_, i) => ({
    x: random(`chx${variant}${i}`) * S,
    y: random(`chy${variant}${i}`) * S,
    w: (4 + 5 * random(`chw${variant}${i}`)) * step,
  }));
  const push = 1 + f * 0.0016;
  return (
    <Plate>
      <AbsoluteFill style={{ background: g(0.06) }} />
      <svg
        width={S}
        height={S}
        style={{
          position: "absolute",
          left: W / 2 - S / 2,
          top: H / 2 - S / 2,
          transform: `scale(${push}) rotate(${-8 + f * 0.03}deg)`,
        }}
      >
        <defs>
          <filter id={`cglow${variant}`} x="-10%" y="-10%" width="120%" height="120%">
            <feGaussianBlur stdDeviation={0.5 * u} />
          </filter>
        </defs>
        {traces.map((t, i) => (
          <path key={i} d={t.d} stroke={g(0.26)} strokeWidth={step * 0.16} fill="none" strokeLinejoin="round" />
        ))}
        {chips.map((c, i) => (
          <g key={i}>
            <rect x={c.x} y={c.y} width={c.w} height={c.w} fill={g(0.12)} stroke={g(0.4)} strokeWidth={step * 0.08} rx={step * 0.2} />
            {Array.from({ length: 8 }, (_, k) => (
              <rect key={k} x={c.x + (k + 0.5) * (c.w / 8) - step * 0.1} y={c.y - step * 0.5} width={step * 0.2} height={step * 0.5} fill={g(0.5)} />
            ))}
          </g>
        ))}
        <g filter={`url(#cglow${variant})`}>
          {traces.map((t, i) => (
            <path
              key={i}
              d={t.d}
              pathLength={100}
              stroke={g(1)}
              strokeWidth={step * 0.22}
              fill="none"
              strokeDasharray="8 92"
              strokeDashoffset={-((f * (0.8 + random(`cp${i}`)) + 100 * random(`co${i}`)) % 100)}
            />
          ))}
        </g>
      </svg>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${g(0, 0)} 30%, ${g(0, 0.7)} 100%)` }} />
    </Plate>
  );
};

// ---------- Unbranded laptop turning (pass 01) ----------

export const LaptopTurn: React.FC<ShotProps> = ({ f }) => {
  const { W, H, u, wide } = useL();
  const lw = (wide ? 56 : 80) * u;
  const depth = lw * 0.68;
  const thick = lw * 0.025;
  const ry = -35 + f * 0.55;
  const face = (style: React.CSSProperties, bg: string) => (
    <div style={{ position: "absolute", backfaceVisibility: "hidden", background: bg, ...style }} />
  );
  return (
    <Plate>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 60%, ${g(0.26)} 0%, ${g(0.04)} 70%)` }} />
      {/* Floor glow */}
      <div
        style={{
          position: "absolute",
          left: W / 2 - lw * 0.8,
          top: H * 0.62,
          width: lw * 1.6,
          height: lw * 0.3,
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${g(0.5, 0.6)} 0%, ${g(0, 0)} 70%)`,
        }}
      />
      <AbsoluteFill style={{ perspective: lw * 3 }}>
        <div
          style={{
            position: "absolute",
            left: W / 2,
            top: H * 0.6,
            transformStyle: "preserve-3d",
            transform: `rotateX(-16deg) rotateY(${ry}deg)`,
          }}
        >
          {/* Deck top, keyboard field and front edge */}
          <div
            style={{
              position: "absolute",
              left: -lw / 2,
              top: -depth / 2,
              width: lw,
              height: depth,
              transform: "rotateX(90deg)",
              background: `linear-gradient(180deg, ${g(0.5)} 0%, ${g(0.36)} 100%)`,
              borderRadius: lw * 0.03,
              display: "grid",
              gridTemplateColumns: "repeat(14, 1fr)",
              gap: lw * 0.005,
              padding: `${depth * 0.1}px ${lw * 0.07}px ${depth * 0.42}px`,
              boxSizing: "border-box",
            }}
          >
            {Array.from({ length: 70 }, (_, i) => (
              <div key={i} style={{ background: g(0.14), borderRadius: lw * 0.003 }} />
            ))}
          </div>
          {face({ left: -lw / 2, top: -thick, width: lw, height: thick, transform: `translateZ(${depth / 2}px)` }, g(0.62))}
          {face({ left: -depth / 2, top: -thick, width: depth, height: thick, transform: `translateX(${lw / 2}px) rotateY(90deg)` }, g(0.4))}
          {face({ left: -depth / 2, top: -thick, width: depth, height: thick, transform: `translateX(${-lw / 2}px) rotateY(-90deg)` }, g(0.4))}
          {/* Lid at 105 deg */}
          <div
            style={{
              position: "absolute",
              left: -lw / 2,
              top: -depth - thick,
              width: lw,
              height: depth,
              transformOrigin: "50% 100%",
              transformStyle: "preserve-3d",
              transform: `translateZ(${-depth / 2}px) rotateX(15deg)`,
            }}
          >
            {face(
              { inset: 0, borderRadius: lw * 0.03, border: `${lw * 0.014}px solid ${g(0.1)}`, boxSizing: "border-box" },
              `radial-gradient(ellipse at 45% 40%, ${g(1)} 0%, ${g(0.72)} 40%, ${g(0.4)} 100%)`,
            )}
            {face({ inset: 0, borderRadius: lw * 0.03, transform: "rotateY(180deg)" }, `linear-gradient(135deg, ${g(0.7)} 0%, ${g(0.42)} 50%, ${g(0.3)} 100%)`)}
          </div>
        </div>
      </AbsoluteFill>
      <Bokeh f={f} seed="turn" n={5} light={0.8} />
    </Plate>
  );
};

// ---------- Network switch, port lights coming on in sequence (pass 03) ----------

export const NetworkSwitch: React.FC<ShotProps> = ({ f }) => {
  const { W, H, u } = useL();
  const pw = Math.max(W, H) * 1.5;
  const ph = pw * 0.24;
  const ports = 16;
  const portW = (pw * 0.82) / ports;
  const panel = (blur: number) => (
    <div
      style={{
        position: "absolute",
        left: W / 2 - pw * 0.5,
        top: H / 2 - ph / 2,
        width: pw,
        height: ph,
        transform: `rotateY(28deg) rotateX(8deg) translateX(${-f * 0.35 * u}px)`,
        background: `linear-gradient(180deg, ${g(0.3)} 0%, ${g(0.2)} 100%)`,
        borderRadius: ph * 0.04,
        filter: blur ? `blur(${blur}px)` : undefined,
      }}
    >
      <svg width={pw} height={ph} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id={`sw${blur}`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur stdDeviation={portW * 0.12} />
          </filter>
        </defs>
        {[0, 1].map((row) =>
          Array.from({ length: ports }, (_, i) => {
            const x = pw * 0.09 + i * portW;
            const y = ph * (0.18 + row * 0.42);
            const at = 6 + (i + row * 0.5) * 2.6;
            const on = f >= at;
            const flick = on && random(`fl${i}${row}${Math.floor(f / 4)}`) > 0.2;
            return (
              <g key={`${row}-${i}`}>
                <path
                  d={`M${x},${y + ph * 0.06} h${portW * 0.82} v${ph * 0.24} h${-portW * 0.24} v${ph * 0.05} h${-portW * 0.34} v${-ph * 0.05} h${-portW * 0.24} Z`}
                  fill={g(0.03)}
                  stroke={g(0.45)}
                  strokeWidth={portW * 0.02}
                />
                <rect x={x + portW * 0.06} y={y} width={portW * 0.18} height={ph * 0.035} fill={g(flick ? 1 : 0.12)} filter={on ? `url(#sw${blur})` : undefined} />
                <rect x={x + portW * 0.06} y={y} width={portW * 0.18} height={ph * 0.035} fill={g(flick ? 1 : 0.12)} />
                <rect x={x + portW * 0.58} y={y} width={portW * 0.18} height={ph * 0.035} fill={g(on ? 0.85 : 0.12)} />
              </g>
            );
          }),
        )}
      </svg>
    </div>
  );
  return (
    <Plate>
      <AbsoluteFill style={{ background: g(0.03) }} />
      <AbsoluteFill style={{ perspective: pw * 0.55 }}>{panel(0.9 * u)}</AbsoluteFill>
      <AbsoluteFill
        style={{
          perspective: pw * 0.55,
          maskImage: "linear-gradient(90deg, transparent 18%, black 34%, black 62%, transparent 78%)",
          WebkitMaskImage: "linear-gradient(90deg, transparent 18%, black 34%, black 62%, transparent 78%)",
        }}
      >
        {panel(0)}
      </AbsoluteFill>
      <Bokeh f={f} seed="switch" n={5} light={0.9} />
    </Plate>
  );
};

// ---------- Scrolling document, out of focus (pass 04) ----------
// Lines are bars, not words; the one sharp line is drawn by the video over the plate.

export const docWidth = (W: number, wide: boolean) => (wide ? W * 0.62 : W * 0.92);
export const docRest = (H: number, lineH: number, settle: number) => H / 2 - (settle + 0.5) * lineH;

export const DocumentScroll: React.FC<ShotProps & { lineH: number; settle: number }> = ({ f, lineH, settle }) => {
  const { W, H, u, wide } = useL();
  const pw = docWidth(W, wide);
  const n = 60;
  // Scroll fast, then ease to rest so line `settle` sits at the frame centre.
  const restY = docRest(H, lineH, settle);
  const y = interpolate(f, [0, 26], [restY + lineH * 26, restY], { ...clamp, easing: Easing.out(Easing.cubic) });
  const blur = interpolate(f, [0, 22, 30], [2.2, 1.2, 0.7], clamp) * u;
  return (
    <Plate>
      <AbsoluteFill style={{ background: g(0.18) }} />
      <div
        style={{
          position: "absolute",
          left: (W - pw) / 2,
          top: y - lineH * 2,
          width: pw,
          height: lineH * (n + 4),
          background: g(0.92),
          filter: `blur(${blur}px)`,
        }}
      >
        {Array.from({ length: n }, (_, i) =>
          i === settle ? null : (
            <div
              key={i}
              style={{
                position: "absolute",
                left: pw * 0.08,
                top: lineH * (i + 2) + lineH * 0.3,
                width: pw * (0.5 + 0.34 * random(`doc${i}`)) * (i % 7 === 6 ? 0.5 : 1),
                height: lineH * 0.34,
                borderRadius: lineH * 0.1,
                background: g(i % 9 === 0 ? 0.15 : 0.45),
              }}
            />
          ),
        )}
      </div>
      <AbsoluteFill style={{ background: `radial-gradient(ellipse at 50% 50%, ${g(0, 0)} 45%, ${g(0, 0.55)} 100%)` }} />
    </Plate>
  );
};
