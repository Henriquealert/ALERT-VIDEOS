import { AbsoluteFill, Audio, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { C, Dot, F } from "../ui/theme";
import {
  BoxedLaptops,
  CircuitBoard,
  Corridor,
  DocumentScroll,
  DuotoneFilter,
  FibreOptic,
  GlassTower,
  KeyboardMacro,
  LaptopLid,
  LaptopTurn,
  NetworkSwitch,
  ServerLeds,
  docRest,
  docWidth,
} from "./SeriesACinematicFootage";
import METRICS from "./series-a-cinematic-metrics.json";
import MONOGRAM from "./series-a-cinematic-monogram.json";
import TL from "./series-a-cinematic-timeline.json";

// "Series A, sorted." — cinematic hype film for the Series A Compliance bundle (Henrique's brief, 24 Oct 2026).
// 38 s, 30 fps, 1920x1080 master and a 1080x1920 re-frame (text 250px clear of the top and bottom).
// 125 BPM; every cut on a beat. Scene, pass, slam and typing frames come from src/videos/series-a-cinematic-timeline.json,
// written by scripts/make-series-a-cinematic-audio.py, which also builds the mix and the captions from the same numbers.
// Footage is CG (src/videos/SeriesACinematicFootage.tsx), graded into the blue duotone. No people anywhere.
// Brand fonts only (CLAUDE.md): the brief's Archivo ExtraBold builders use DM Sans Bold, its DM Mono typewriter
// uses DM Sans Medium; statement, numerals and serif are as briefed. One logo, on the end card. CTA Book a Call.

export const SERIES_A_CINEMATIC_16X9 = { fps: 30, durationInFrames: TL.total, width: 1920, height: 1080 } as const;
export const SERIES_A_CINEMATIC_9X16 = { ...SERIES_A_CINEMATIC_16X9, width: 1080, height: 1920 } as const;
export const SERIES_A_CINEMATIC_THUMB_FRAME = TL.scenes.sorted + 82;

const MIX = "audio/Alert Global Tech - Series A Sorted Cinematic Mix.wav";
const S = TL.scenes;
const BEAT = TL.beatFrames;
const bf = (b: number) => Math.round(b * BEAT);
const ROLL = ["LAPTOPS", "LICENCES", "ACCOUNTS", "PASSWORDS", "OFFBOARDING"];
const CAPSULES = ["Microsoft 365", "Copilot", "Intune", "Defender"];
const DOC_LINE = 30; // the one sharp line of the document plate

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, easing = Easing.out(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing });

const useL = () => {
  const { width: W, height: H, fps } = useVideoConfig();
  const u = Math.min(W, H) / 100;
  const wide = W > H;
  const safeY = wide ? 0 : (250 / 1920) * H;
  return { W, H, u, fps, wide, safeY, side: wide ? 0.035 * W : 0.06 * W };
};

// ---------- Type metrics ----------

type Face = keyof typeof METRICS;
const FACE: Record<Face, React.CSSProperties> = {
  sansBold: { fontFamily: F.sans, fontWeight: 700 },
  statement: { fontFamily: F.statement, fontWeight: 700, fontStyle: "italic" },
  numeral: { fontFamily: F.numeral, fontWeight: 700 },
  serifItalic: { fontFamily: F.accent, fontWeight: 400, fontStyle: "italic" },
};
const DOT_EM = 0.72 * 0.19 * 1.35; // <Dot> width plus its margin, in em
const advance = (text: string, face: Face, ls: number) => {
  const adv = METRICS[face].adv as Record<string, number>;
  return [...text].reduce((w, ch) => w + (adv[ch] ?? 0.6) + ls, 0);
};
// Font size at which `text` (plus an optional dot) spans exactly `width`.
const fit = (text: string, face: Face, width: number, ls = -0.02, dot = false, caps = true) =>
  width / (advance(caps ? text.toUpperCase() : text, face, ls) + (dot ? DOT_EM : 0));

// ---------- Shared devices ----------

const Ground: React.FC<{ color: string; children?: React.ReactNode; style?: React.CSSProperties }> = ({ color, children, style }) => (
  <AbsoluteFill style={{ background: color, overflow: "hidden", ...style }}>{children}</AbsoluteFill>
);

// Darkens the plate where type sits, so Ivory stays legible on bright footage.
const Scrim: React.FC<{ strength?: number; at?: string }> = ({ strength = 0.55, at = "50% 50%" }) => (
  <AbsoluteFill style={{ background: `radial-gradient(ellipse 75% 65% at ${at}, rgba(16,27,50,${strength}) 0%, rgba(16,27,50,${strength * 0.45}) 60%, rgba(16,27,50,0) 100%)` }} />
);

type Word = { t: string; at: number };
type Line = { words: Word[]; dot?: boolean; box?: boolean };

// Justified builder: each line sized to the full width, words land on their frames.
const Builder: React.FC<{
  f: number;
  lines: Line[];
  width: number;
  left: number;
  centerY: number;
  face?: Face;
  color?: string;
  dotAt?: number;
  lead?: number;
  maxSize?: number;
  boxAt?: number;
}> = ({ f, lines, width, left, centerY, face = "sansBold", color = C.ivory, dotAt, lead = 0.9, maxSize = Infinity, boxAt = 0 }) => {
  const ls = face === "sansBold" ? -0.02 : 0;
  const sizes = lines.map((l) => Math.min(maxSize, fit(l.words.map((w) => w.t).join(" "), face, l.box ? width * 0.94 : width, ls, l.dot)));
  const total = sizes.reduce((a, s) => a + s * lead, 0);
  let y = centerY - total / 2;
  return (
    <>
      {lines.map((l, li) => {
        const fs = sizes[li];
        const top = y;
        y += fs * lead;
        const wipe = l.box ? ease(f, boxAt, boxAt + 6, Easing.inOut(Easing.cubic)) : 0;
        return (
          <div
            key={li}
            style={{
              position: "absolute",
              left: l.box ? left + width * 0.03 : left,
              top: top - fs * 0.13,
              ...FACE[face],
              fontSize: fs,
              lineHeight: 1,
              letterSpacing: `${ls}em`,
              fontKerning: "none",
              whiteSpace: "nowrap",
              color: l.box && wipe > 0 ? C.ink : color,
              textTransform: "uppercase",
            }}
          >
            {l.box ? (
              <div
                style={{
                  position: "absolute",
                  left: -width * 0.03,
                  right: l.dot ? fs * (DOT_EM + 0.02) : -width * 0.03,
                  top: fs * 0.1,
                  bottom: fs * 0.08,
                  background: C.lime,
                  clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
                }}
              />
            ) : null}
            {l.words.map((w, wi) => {
              const p = ease(f, w.at, w.at + 4);
              return (
                <span
                  key={wi}
                  style={{
                    position: "relative",
                    display: "inline-block",
                    opacity: f >= w.at ? 1 : 0,
                    transform: `translateY(${(1 - p) * 0.18 * fs}px)`,
                    marginLeft: wi ? `${(METRICS[face].adv as Record<string, number>)[" "]}em` : 0,
                  }}
                >
                  {w.t}
                </span>
              );
            })}
            {l.dot ? (
              <span style={{ position: "relative", opacity: f >= (dotAt ?? Infinity) ? 1 : 0 }}>
                <Dot fontSize={fs} color={l.box ? C.lime : C.lime} />
              </span>
            ) : null}
          </div>
        );
      })}
    </>
  );
};

// Blinking cursor: on for half a beat, off for half a beat.
const blink = (f: number) => Math.floor(f / (BEAT / 2)) % 2 === 0;
const Cursor: React.FC<{ h: number; color?: string; f: number; style?: React.CSSProperties }> = ({ h, color = C.lime, f, style }) => (
  <span
    style={{
      display: "inline-block",
      width: Math.max(3, h * 0.07),
      height: h,
      background: color,
      opacity: blink(f) ? 1 : 0,
      verticalAlign: "baseline",
      ...style,
    }}
  />
);

// Typewriter: DM Sans in a lime selection box, typed letter by letter, lime cursor after it.
const Typewriter: React.FC<{ f: number; start: number; text: string; cps: number; fs: number; left: number; top: number }> = ({
  f,
  start,
  text,
  cps,
  fs,
  left,
  top,
}) => {
  const n = Math.max(0, Math.min(text.length, Math.floor(((f - start) / 30) * cps) + 1));
  if (f < start) return null;
  return (
    <div style={{ position: "absolute", left, top, display: "flex", alignItems: "center", gap: fs * 0.18 }}>
      <div
        style={{
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: fs,
          lineHeight: 1,
          color: C.ink,
          background: C.lime,
          padding: `${fs * 0.16}px ${fs * 0.24}px ${fs * 0.2}px`,
          whiteSpace: "pre",
          fontFeatureSettings: '"tnum"',
        }}
      >
        {text.slice(0, n)}
      </div>
      <Cursor h={fs * 1.25} f={n < text.length ? 0 : f} />
    </div>
  );
};

// Ivory viewfinder brackets that snap onto a target, with a centre crosshair.
const Brackets: React.FC<{ f: number; at: number; x: number; y: number; w: number; h: number; u: number }> = ({ f, at, x, y, w, h, u }) => {
  if (f < at) return null;
  const { fps } = useL();
  const p = spring({ frame: f - at, fps, config: { damping: 11, stiffness: 320 } });
  const grow = 1 + (1 - p) * 0.45;
  const bw = w * grow;
  const bh = h * grow;
  const arm = Math.min(w, h) * 0.18;
  const t = Math.max(2, 0.32 * u);
  const corner = (sx: number, sy: number) => (
    <div
      style={{
        position: "absolute",
        left: x + (sx * bw) / 2 - (sx > 0 ? arm : 0),
        top: y + (sy * bh) / 2 - (sy > 0 ? arm : 0),
        width: arm,
        height: arm,
        borderLeft: sx < 0 ? `${t}px solid ${C.ivory}` : undefined,
        borderRight: sx > 0 ? `${t}px solid ${C.ivory}` : undefined,
        borderTop: sy < 0 ? `${t}px solid ${C.ivory}` : undefined,
        borderBottom: sy > 0 ? `${t}px solid ${C.ivory}` : undefined,
        boxSizing: "border-box",
      }}
    />
  );
  const c = 2.4 * u * p;
  return (
    <>
      {corner(-1, -1)}
      {corner(1, -1)}
      {corner(-1, 1)}
      {corner(1, 1)}
      <div style={{ position: "absolute", left: x - c, top: y - t / 2, width: 2 * c, height: t, background: C.ivory }} />
      <div style={{ position: "absolute", left: x - t / 2, top: y - c, width: t, height: 2 * c, background: C.ivory }} />
    </>
  );
};

// Small crosshairs (+) scattered at frame corners, as in the reference's viewfinder look.
const Crosshair: React.FC<{ x: number; y: number; s: number }> = ({ x, y, s }) => (
  <>
    <div style={{ position: "absolute", left: x - s, top: y - 1, width: 2 * s, height: 2, background: C.ivory, opacity: 0.8 }} />
    <div style={{ position: "absolute", left: x - 1, top: y - s, width: 2, height: 2 * s, background: C.ivory, opacity: 0.8 }} />
  </>
);

// Diagonal wipe: the next shot is revealed behind a blue -> sky gradient beam.
const BeamWipe: React.FC<{ f: number; dur?: number; under: React.ReactNode; children: React.ReactNode }> = ({ f, dur = 10, under, children }) => {
  const { W, H } = useL();
  const p = ease(f, 0, dur, Easing.inOut(Easing.cubic));
  if (p >= 1) return <>{children}</>;
  const slope = H * 0.6;
  const x = -slope - W * 0.15 + (W + 2 * slope + W * 0.3) * p; // leading edge at mid-height
  const beam = W * 0.14;
  const poly = (x0: number) => `polygon(0 0, ${x0 + slope / 2}px 0, ${x0 - slope / 2}px 100%, 0 100%)`;
  return (
    <>
      {under}
      <AbsoluteFill style={{ clipPath: poly(x - beam) }}>{children}</AbsoluteFill>
      <AbsoluteFill
        style={{
          clipPath: `polygon(${x - beam + slope / 2}px 0, ${x + slope / 2}px 0, ${x - slope / 2}px 100%, ${x - beam - slope / 2}px 100%)`,
          background: `linear-gradient(${90 - (Math.atan2(slope, H) * 180) / Math.PI}deg, ${C.skyLight} 0%, ${C.sky} 45%, ${C.blue} 100%)`,
        }}
      />
    </>
  );
};

// Glitch-slice: horizontal bands of the shot jump sideways for a few frames.
const Glitch: React.FC<{ f: number; on: [number, number]; seed: string; children: React.ReactNode }> = ({ f, on, seed, children }) => {
  const { W } = useL();
  if (f < on[0] || f >= on[1]) return <>{children}</>;
  const bands = 7;
  return (
    <AbsoluteFill>
      {children}
      {Array.from({ length: bands }, (_, i) => {
        const a = random(`${seed}-a${i}-${f}`);
        const top = a * 92;
        const h = 2 + random(`${seed}-h${i}-${f}`) * 9;
        const dx = (random(`${seed}-x${i}-${f}`) - 0.5) * W * 0.18;
        return (
          <AbsoluteFill key={i} style={{ clipPath: `inset(${top}% 0 ${Math.max(0, 100 - top - h)}% 0)`, transform: `translateX(${dx}px)` }}>
            {children}
          </AbsoluteFill>
        );
      })}
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: `${random(`${seed}-l${f}`) * 100}%`,
          height: 3,
          background: C.lime,
        }}
      />
    </AbsoluteFill>
  );
};

// Whip-pan: slide with motion blur, out to the left at the end of a shot, in from the right at the start.
const Whip: React.FC<{ f: number; inAt?: number; outAt?: number; children: React.ReactNode }> = ({ f, inAt, outAt, children }) => {
  const { W, u } = useL();
  let dx = 0;
  if (inAt !== undefined && f < inAt + 4) dx = (1 - ease(f, inAt, inAt + 4)) * W * 0.4;
  if (outAt !== undefined && f >= outAt - 4) dx = -ease(f, outAt - 4, outAt, Easing.in(Easing.cubic)) * W * 0.4;
  return (
    <AbsoluteFill style={{ transform: `translateX(${dx}px)`, filter: dx ? `blur(${Math.min(4 * u, Math.abs(dx) / 30)}px)` : undefined }}>{children}</AbsoluteFill>
  );
};

const Grain: React.FC<{ frame: number }> = ({ frame }) => {
  const { W, H } = useL();
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.13, mixBlendMode: "overlay", pointerEvents: "none" }}>
      <filter id="sa-grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={frame % 24} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter="url(#sa-grain)" />
    </svg>
  );
};

const LimeFlash: React.FC = () => <AbsoluteFill style={{ background: C.lime }} />;

// ---------- Composition ----------

export const SeriesACinematic: React.FC = () => {
  const frame = useCurrentFrame();
  const order = [
    [S.open, Open],
    [S.more, More],
    [S.prove, Prove],
    [S.sidejob, SideJob],
    [S.sorted, SortedBeat],
    [S.bundle, Bundle],
    [S.supplier, Supplier],
    [S.end, EndCard],
  ] as const;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <DuotoneFilter />
      <Audio src={staticFile(MIX)} />
      {order.map(([start, Scene], i) => {
        const end = i + 1 < order.length ? order[i + 1][0] : TL.total;
        return frame >= start && frame < end ? <Scene key={i} f={frame - start} /> : null;
      })}
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};

type SceneProps = { f: number };

// ---------- 1 · 0:00 What happens after the Series A? ----------

const Open: React.FC<SceneProps> = ({ f }) => {
  const { W, H, u, wide, side, safeY } = useL();
  const flash = bf(1);
  const wipe = bf(3);
  const ty = TL.typing[0];
  const at = (b: number) => bf(b);
  const lines: Line[] = [
    { words: [{ t: "What", at: wipe + 1 }, { t: "happens", at: wipe + 4 }] },
    { words: [{ t: "after", at: wipe + 8 }, { t: "the", at: wipe + 11 }] },
    { words: [{ t: "Series", at: at(4) }, { t: "A", at: at(4.5) }], dot: true },
  ];
  const lid = (
    <AbsoluteFill>
      <LaptopLid f={f - flash} />
      <Brackets f={f} at={at(2)} x={W / 2} y={H * 0.36} w={wide ? W * 0.46 : W * 0.78} h={wide ? H * 0.42 : H * 0.2} u={u} />
      <Typewriter f={f} start={ty.frame} text={ty.text} cps={ty.cps} fs={(wide ? 6 : 6.4) * u} left={wide ? W * 0.5 - 30 * u : side} top={wide ? H * 0.76 : H * 0.66} />
    </AbsoluteFill>
  );
  if (f < flash) return <Ground color="#000" />;
  if (f < flash + 2) return <LimeFlash />;
  return (
    <BeamWipe f={f - wipe} under={lid}>
      <AbsoluteFill>
        <GlassTower f={f - wipe + 20} />
        <Scrim strength={0.6} />
        <Builder f={f} lines={lines} width={W - 2 * side} left={side} centerY={H / 2} dotAt={at(5)} maxSize={wide ? H * 0.3 : (H - 2 * safeY) * 0.2} />
      </AbsoluteFill>
    </BeamWipe>
  );
};

// ---------- 2 · 0:04 MORE / LAPTOPS / MORE / ACCESS / MORE / RISK ----------

const MORE_SHOTS = [
  (f: number) => <BoxedLaptops f={f} />,
  (f: number) => <KeyboardMacro f={f} />,
  (f: number) => <ServerLeds f={f} />,
  (f: number) => <FibreOptic f={f} />,
  (f: number) => <BoxedLaptops f={f} variant={1} />,
  (f: number) => <KeyboardMacro f={f} variant={1} />,
  (f: number) => <ServerLeds f={f} variant={1} />,
  (f: number) => <FibreOptic f={f} variant={1} />,
  (f: number) => <BoxedLaptops f={f + 30} />,
  (f: number) => <ServerLeds f={f + 30} />,
  (f: number) => <FibreOptic f={f + 40} />,
];
const SLAM_WORDS = ["More", "Laptops", "More", "Access", "More", "Risk"];

const More: React.FC<SceneProps> = ({ f }) => {
  const { W, H, u, wide } = useL();
  const g = f + S.more;
  // One footage cut per beat, beats 8-18.
  const cut = Math.min(MORE_SHOTS.length - 1, Math.floor((g - bf(8)) / BEAT + 0.001));
  const cutAt = bf(8 + cut);
  const slam = TL.slams.filter((s) => g >= s).length - 1;
  const sAt = TL.slams[slam];
  const word = SLAM_WORDS[slam];
  const withDot = slam % 2 === 1;
  const fs = Math.min(fit(word, "sansBold", W * (wide ? 0.8 : 0.88), -0.02, withDot), wide ? H * 0.42 : H * 0.16);
  const p = ease(g, sAt, sAt + 4, Easing.out(Easing.back(1.6)));
  const shake = g - sAt < 4 ? (random(`sh${g}`) - 0.5) * 2.2 * u : 0;
  return (
    <Glitch f={g} on={[S.prove - 8, S.prove]} seed="more">
      <Whip f={g} outAt={S.prove}>
        <AbsoluteFill style={{ transform: `translate(${shake}px, ${shake * 0.6}px) scale(${1.02 + 0.03 * (1 - p)})` }}>{MORE_SHOTS[cut](g - cutAt + 6)}</AbsoluteFill>
        <Scrim strength={0.5} />
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div
            style={{
              ...FACE.sansBold,
              fontSize: fs,
              lineHeight: 1,
              letterSpacing: "-0.02em",
              fontKerning: "none",
              textTransform: "uppercase",
              color: C.ivory,
              transform: `scale(${1.35 - 0.35 * p})`,
              filter: p < 0.6 ? `blur(${(1 - p) * 1.2 * u}px)` : undefined,
              whiteSpace: "nowrap",
            }}
          >
            {word}
            {withDot ? <Dot fontSize={fs} color={C.lime} /> : null}
          </div>
        </AbsoluteFill>
      </Whip>
    </Glitch>
  );
};

// ---------- 3 · 0:09 YOUR FIRST BIG CUSTOMER ASKS: / CAN YOU PROVE IT ----------

const RollingColumn: React.FC<{ f: number; fs: number; x: number }> = ({ f, fs, x }) => {
  const { H } = useL();
  const step = fs * 1.05;
  const n = Math.ceil(H / step) + 6;
  const off = (f * fs * 0.06) % (step * ROLL.length);
  return (
    <div style={{ position: "absolute", left: x, top: -off, width: 0, opacity: 0.15 }}>
      {Array.from({ length: n }, (_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: i * step,
            left: 0,
            transform: "translateX(-50%)",
            ...FACE.sansBold,
            fontSize: fs,
            lineHeight: 1,
            letterSpacing: "-0.01em",
            color: C.ivory,
            whiteSpace: "nowrap",
          }}
        >
          {ROLL[i % ROLL.length]}
        </div>
      ))}
    </div>
  );
};

const Prove: React.FC<SceneProps> = ({ f }) => {
  const { W, H, u, wide, side, safeY } = useL();
  const g = f + S.prove;
  const shrink = TL.pip.shrink;
  const punch = TL.pip.punch;
  // Picture-in-picture: the corridor scales into an Ivory-bordered frame, then punches back out.
  const pipIn = ease(g, shrink, shrink + 8, Easing.inOut(Easing.cubic));
  const pipOut = ease(g, punch, punch + 3, Easing.out(Easing.quad));
  const k = 1 - (wide ? 0.48 : 0.42) * pipIn * (1 - pipOut);
  const framed = g >= shrink && g < punch + 3;
  const border = 0.7 * u;
  const ask: Line[] = [
    { words: [{ t: "Your", at: 283 }, { t: "first", at: 288 }] },
    { words: [{ t: "big", at: 296 }, { t: "customer", at: 300 }] },
    { words: [{ t: "asks:", at: 315 }] },
  ];
  const prove: Line[] = [
    { words: [{ t: "Can", at: punch }, { t: "you", at: punch + 3 }] },
    { words: [{ t: "Prove", at: punch + 14 }, { t: "it", at: punch + 18 }], dot: true, box: true },
  ];
  const max = wide ? H * 0.3 : (H - 2 * safeY) * 0.17;
  return (
    <Ground color={C.ink}>
      <RollingColumn f={f} fs={(wide ? 9 : 10) * u} x={W / 2} />
      <AbsoluteFill style={{ transform: `scale(${k})` }}>
        <AbsoluteFill style={{ outline: framed ? `${border / k}px solid ${C.ivory}` : undefined, overflow: "hidden" }}>
          <Corridor f={f + 10} />
          <Scrim strength={0.45} />
        </AbsoluteFill>
      </AbsoluteFill>
      {framed ? (
        <>
          <Crosshair x={W * 0.5} y={H * (wide ? 0.12 : 0.2)} s={1.6 * u} />
          <Crosshair x={W * 0.5} y={H * (wide ? 0.88 : 0.8)} s={1.6 * u} />
        </>
      ) : null}
      {/* The column also runs over the corridor, behind the headline */}
      {!framed ? <RollingColumn f={f} fs={(wide ? 9 : 10) * u} x={W / 2} /> : null}
      {g < shrink ? (
        <Builder f={g} lines={ask} width={W - 2 * side} left={side} centerY={H / 2} maxSize={max} />
      ) : g >= punch ? (
        <Builder f={g} lines={prove} width={W - 2 * side} left={side} centerY={H / 2} dotAt={punch + 29} boxAt={punch + 14} maxSize={max * 1.1} />
      ) : null}
    </Ground>
  );
};

// ---------- 4 · 0:14 IT STOPS BEING A SIDE JOB (lime flash, statement type) ----------

const SideJob: React.FC<SceneProps> = ({ f }) => {
  const { W, H, wide, side, safeY } = useL();
  const g = f + S.sidejob;
  const lines = [
    [
      { t: "IT", at: 438 },
      { t: "STOPS", at: 444 },
    ],
    [
      { t: "BEING", at: 453 },
      { t: "A", at: 458 },
    ],
    [
      { t: "SIDE", at: 465 },
      { t: "JOB", at: 474 },
    ],
  ];
  const widest = Math.max(...lines.map((l, i) => advance(l.map((w) => w.t).join(" "), "statement", 0) + (i === 2 ? DOT_EM : 0)));
  const fs = Math.min((W - 2 * side) / widest, wide ? H * 0.3 : (H - 2 * safeY) * 0.2);
  const push = interpolate(f, [0, 86], [1, 1.05]);
  return (
    <Ground color={C.lime}>
      <div
        style={{
          position: "absolute",
          left: side,
          top: H / 2 - fs * 0.86 * 1.5,
          ...FACE.statement,
          fontSize: fs,
          lineHeight: 0.86,
          color: C.ink,
          transform: `scale(${push})`,
          transformOrigin: "left center",
          whiteSpace: "nowrap",
        }}
      >
        {lines.map((l, li) => (
          <div key={li}>
            {l.map((w, wi) => (
              <span
                key={wi}
                style={{
                  display: "inline-block",
                  marginLeft: wi ? "0.22em" : 0,
                  opacity: g >= w.at ? 1 : 0,
                  transform: `translateX(${(1 - ease(g, w.at, w.at + 4)) * -0.12 * fs}px)`,
                }}
              >
                {w.t}
              </span>
            ))}
            {li === 2 ? <span style={{ opacity: g >= 482 ? 1 : 0 }}>{<Dot fontSize={fs} color={C.ink} />}</span> : null}
          </div>
        ))}
      </div>
    </Ground>
  );
};

// ---------- 5 · 0:17 Series A, sorted (huge, cropped at the frame edges) ----------

const SortedType: React.FC<{ f: number; inA: number; inB: number }> = ({ f, inA, inB }) => {
  const { W, H, wide, safeY } = useL();
  const fa = Math.min(wide ? H * 0.52 : H * 0.3, W / (advance("Series A,", "sansBold", -0.03) - 0.02));
  const fb = wide ? H * 0.62 : (W * 0.9) / (advance("sorted", "serifItalic", 0) + DOT_EM + 0.12);
  const pa = ease(f, inA, inA + 6);
  const pb = ease(f, inB, inB + 8);
  return (
    <>
      <div
        style={{
          position: "absolute",
          left: -0.04 * W + (1 - pa) * -0.4 * W,
          top: wide ? -0.14 * fa : safeY + 0.02 * H,
          ...FACE.sansBold,
          fontSize: fa,
          lineHeight: 1,
          letterSpacing: "-0.03em",
          color: C.ivory,
          whiteSpace: "nowrap",
          opacity: f >= inA ? 1 : 0,
        }}
      >
        Series A,
      </div>
      <div
        style={{
          position: "absolute",
          right: wide ? 0.03 * W : 0.02 * W,
          bottom: wide ? -0.2 * fb : safeY + 0.02 * H,
          display: "flex",
          alignItems: "baseline",
          ...FACE.serifItalic,
          fontSize: fb,
          lineHeight: 1,
          color: C.ivory,
          whiteSpace: "nowrap",
          opacity: f >= inB ? 1 : 0,
          transform: `translateY(${(1 - pb) * 0.12 * fb}px)`,
        }}
      >
        sorted
        <Dot fontSize={fb} color={C.lime} />
        <Cursor h={fb * 0.62} f={f} style={{ marginLeft: fb * 0.05 }} />
      </div>
    </>
  );
};

const SortedBeat: React.FC<SceneProps> = ({ f }) => (
  <AbsoluteFill>
    <CircuitBoard f={f + 20} />
    <Scrim strength={0.35} />
    <SortedType f={f} inA={2} inB={bf(37) - S.sorted} />
  </AbsoluteFill>
);

// ---------- 6 · 0:20 four passes, 01/04 to 04/04 ----------

const PassNumber: React.FC<{ n: number; f: number }> = ({ n, f }) => {
  const { u, wide, side, safeY } = useL();
  const fs = (wide ? 24 : 22) * u;
  const p = ease(f, 0, 5, Easing.out(Easing.back(1.5)));
  return (
    <div
      style={{
        position: "absolute",
        right: side,
        bottom: wide ? -fs * 0.12 : safeY + 2 * u,
        ...FACE.numeral,
        fontSize: fs,
        lineHeight: 1,
        color: C.ivory,
        transform: `translateY(${(1 - p) * fs * 0.5}px)`,
        whiteSpace: "nowrap",
      }}
    >
      0{n}
      <span style={{ fontSize: fs * 0.42, color: C.ivory, opacity: 0.7 }}>/04</span>
    </div>
  );
};

const CapsuleRing: React.FC<{ f: number }> = ({ f }) => {
  const { W, H, u, wide } = useL();
  const r = (wide ? 52 : 46) * u;
  const capW = (wide ? 50 : 52) * u;
  const capH = capW * 0.3;
  const spin = -f * 1.6 + 20;
  return (
    <AbsoluteFill style={{ perspective: r * 5 }}>
      <div style={{ position: "absolute", left: W / 2, top: H / 2, transformStyle: "preserve-3d", transform: `rotateX(-14deg) rotateZ(-8deg) rotateY(${spin}deg)` }}>
        {CAPSULES.map((t, i) => {
          const a = (i * 360) / CAPSULES.length;
          const facing = Math.cos(((a + spin) * Math.PI) / 180);
          return (
            <div
              key={t}
              style={{
                position: "absolute",
                left: -capW / 2,
                top: -capH / 2,
                width: capW,
                height: capH,
                transform: `rotateY(${a}deg) translateZ(${r}px)`,
                borderRadius: capH,
                border: `${0.5 * u}px solid ${C.ivory}`,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: F.sans,
                fontWeight: 600,
                fontSize: capH * 0.4,
                color: C.ivory,
                whiteSpace: "nowrap",
                opacity: 0.35 + 0.65 * Math.max(0, facing),
                background: facing > 0.5 ? "rgba(16,27,50,0.55)" : "transparent",
              }}
            >
              {/* Capsules on the far side turn their word round so it never reads mirrored */}
              <span style={{ display: "inline-block", transform: facing < 0 ? "rotateY(180deg)" : undefined }}>{t}</span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Pass1: React.FC<{ f: number; g: number }> = ({ f, g }) => {
  const { W, H, u, wide, side } = useL();
  const ty = TL.typing[1];
  return (
    <AbsoluteFill>
      <LaptopTurn f={f + 10} />
      <Brackets f={g} at={ty.frame - 2} x={W / 2} y={H * (wide ? 0.42 : 0.47)} w={wide ? W * 0.36 : W * 0.86} h={wide ? H * 0.52 : H * 0.26} u={u} />
      <Typewriter f={g} start={ty.frame} text={ty.text} cps={ty.cps} fs={(wide ? 5.6 : 5.6) * u} left={side} top={wide ? H * 0.09 : H * 0.2} />
    </AbsoluteFill>
  );
};

const Pass2: React.FC<{ f: number }> = ({ f }) => (
  <AbsoluteFill>
    <FibreOptic f={f + 30} soft />
    <Scrim strength={0.35} />
    <CapsuleRing f={f} />
  </AbsoluteFill>
);

const Pass3: React.FC<{ f: number; g: number }> = ({ f, g }) => {
  const { H, u, wide, side } = useL();
  const ty = TL.typing[2];
  return (
    <AbsoluteFill>
      <NetworkSwitch f={f} />
      <Typewriter f={g} start={ty.frame} text={ty.text} cps={ty.cps} fs={(wide ? 5.6 : 4.6) * u} left={side} top={wide ? H * 0.09 : H * 0.2} />
    </AbsoluteFill>
  );
};

const DocLine: React.FC<{ g: number; hlAt: number }> = ({ g, hlAt }) => {
  const { W, H, u, wide } = useL();
  const lineH = (wide ? 7.5 : 5.5) * u;
  const pw = docWidth(W, wide);
  const fs = lineH * 0.62;
  const text = "SOC 2 device evidence";
  const textW = advance(text, "sansBold", 0) * fs;
  const p = ease(g, hlAt, hlAt + 16, Easing.inOut(Easing.cubic));
  const x0 = (W - pw) / 2 + pw * 0.08;
  return (
    <div style={{ position: "absolute", left: x0, top: H / 2 - lineH / 2, height: lineH, display: "flex", alignItems: "center" }}>
      <div
        style={{
          position: "absolute",
          left: -fs * 0.2,
          top: lineH * 0.06,
          height: lineH * 0.88,
          width: (textW + fs * 0.4) * p,
          background: C.lime,
        }}
      />
      <div style={{ position: "relative", ...FACE.sansBold, fontSize: fs, lineHeight: 1, color: C.ink, whiteSpace: "nowrap" }}>{text}</div>
      {g >= hlAt - 6 ? (
        <div
          style={{
            position: "absolute",
            left: -fs * 0.2 + (textW + fs * 0.4) * p,
            top: -lineH * 0.05,
            width: Math.max(3, 0.35 * u),
            height: lineH * 1.1,
            background: C.lime,
            boxShadow: `0 0 0 ${Math.max(1, 0.12 * u)}px ${C.ink}`,
            opacity: p >= 1 && !blink(g) ? 0 : 1,
          }}
        />
      ) : null}
    </div>
  );
};

const Pass4: React.FC<{ f: number; g: number }> = ({ f, g }) => {
  const { u, wide } = useL();
  const lineH = (wide ? 7.5 : 5.5) * u;
  return (
    <AbsoluteFill>
      <DocumentScroll f={f} lineH={lineH} settle={DOC_LINE} />
      <Scrim strength={0.7} at="100% 100%" />
      {f >= 24 ? <DocLine g={g} hlAt={TL.passes[3] + 17} /> : null}
    </AbsoluteFill>
  );
};

const Bundle: React.FC<SceneProps> = ({ f }) => {
  const g = f + S.bundle;
  const i = TL.passes.filter((p) => g >= p).length - 1;
  const pf = g - TL.passes[i];
  const shot = [<Pass1 key={0} f={pf} g={g} />, <Pass2 key={1} f={pf} />, <Pass3 key={2} f={pf} g={g} />, <Pass4 key={3} f={pf} g={g} />][i];
  return (
    <Glitch f={g} on={i === 1 ? [TL.passes[1], TL.passes[1] + 3] : i === 3 ? [TL.passes[3], TL.passes[3] + 3] : [0, 0]} seed={`pass${i}`}>
      <Whip f={g} inAt={i === 2 ? TL.passes[2] : undefined}>
        {shot}
        <PassNumber n={i + 1} f={pf} />
      </Whip>
    </Glitch>
  );
};

// ---------- 7 · 0:30 ONE SUPPLIER, FROM QUOTE TO SETUP / English · Español · Português ----------

const LANG_CARDS = [
  { t: "English", bg: C.lime, fg: C.ink },
  { t: "Español", bg: C.ivory, fg: C.blue },
  { t: "Português", bg: C.ink, fg: C.ivory },
];

const Supplier: React.FC<SceneProps> = ({ f }) => {
  const { W, H, u, wide, side, safeY } = useL();
  const g = f + S.supplier;
  const card = TL.langs.filter((l) => g >= l).length - 1;
  if (card >= 0) {
    const c = LANG_CARDS[card];
    const cf = g - TL.langs[card];
    const fs = Math.min(fit(c.t, "serifItalic", W * (wide ? 0.62 : 0.8), 0, false, false), wide ? H * 0.42 : H * 0.2);
    return (
      <Ground color={c.bg}>
        <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ ...FACE.serifItalic, fontSize: fs, lineHeight: 1, color: c.fg, transform: `scale(${1.12 - 0.12 * ease(cf, 0, 5)})`, whiteSpace: "nowrap" }}>{c.t}</div>
        </AbsoluteFill>
      </Ground>
    );
  }
  const lines: Line[] = [
    { words: [{ t: "One", at: 909 }, { t: "supplier,", at: 915 }] },
    { words: [{ t: "from", at: 933 }, { t: "quote", at: 940 }] },
    { words: [{ t: "to", at: 948 }, { t: "setup", at: 953 }], dot: true },
  ];
  const lineH = (wide ? 7.5 : 5.5) * u;
  return (
    <BeamWipe
      f={f}
      under={
        <AbsoluteFill>
          <DocumentScroll f={f + 86} lineH={lineH} settle={DOC_LINE} />
          <DocLine g={g} hlAt={TL.passes[3] + 17} />
        </AbsoluteFill>
      }
    >
      <AbsoluteFill>
        <GlassTower f={f} variant={1} />
        <Scrim strength={0.62} />
        <Builder f={g} lines={lines} width={W - 2 * side} left={side} centerY={H / 2} dotAt={965} maxSize={wide ? H * 0.3 : (H - 2 * safeY) * 0.2} />
      </AbsoluteFill>
    </BeamWipe>
  );
};

// ---------- 8 · 0:34 End card: Electric Blue, outlined a! supergraphic, lockup, Book a Call ----------

const EndCard: React.FC<SceneProps> = ({ f }) => {
  const { W, H, u, fps, wide, side, safeY } = useL();
  const g = f + S.end;
  const mh = wide ? H * 1.35 : H * 0.78;
  const mw = (mh * MONOGRAM.width) / MONOGRAM.height;
  const draw = ease(f, 0, 30, Easing.inOut(Easing.cubic));
  const drift = interpolate(f, [0, 103], [1.04, 1]);
  const logoW = (wide ? 26 : 44) * u;
  const fa = (wide ? 17 : 15) * u;
  const pill = spring({ frame: g - 1094, fps, config: { damping: 12, stiffness: 220 } });
  const inn = (at: number) => ({ opacity: ease(g, at, at + 6), transform: `translateY(${(1 - ease(g, at, at + 8)) * 3 * u}px)` });
  return (
    <Ground color={C.blue}>
      <svg
        width={mw}
        height={mh}
        viewBox={`0 0 ${MONOGRAM.width} ${MONOGRAM.height}`}
        style={{
          position: "absolute",
          left: wide ? W - mw * 0.78 : W - mw * 0.72,
          top: wide ? H - mh * 0.82 : H - mh * 0.86,
          transform: `scale(${drift})`,
          transformOrigin: "100% 100%",
          overflow: "visible",
        }}
      >
        <path d={MONOGRAM.d} fill="none" stroke={C.lime} strokeWidth={(0.22 * u * MONOGRAM.height) / mh} pathLength={1} strokeDasharray="1 1" strokeDashoffset={1 - draw} />
      </svg>
      <Img
        src={staticFile(LOGO_FILE)}
        style={{ position: "absolute", left: side, top: wide ? 6 * u : safeY + 2 * u, width: logoW, height: logoW / LOGO_RATIO, ...inn(S.end) }}
      />
      <div style={{ position: "absolute", left: side, top: wide ? H * 0.36 : H * 0.36, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
        <div style={{ display: "flex", alignItems: "baseline", flexWrap: wide ? "nowrap" : "wrap", columnGap: fa * 0.25, whiteSpace: "nowrap" }}>
          <span style={{ ...FACE.sansBold, fontSize: fa, lineHeight: 1, letterSpacing: "-0.025em", color: C.ivory, ...inn(1039) }}>Series A,</span>
          <span style={{ ...FACE.serifItalic, fontSize: fa * 1.18, lineHeight: 1, color: C.ivory, display: "inline-flex", alignItems: "baseline", ...inn(1057) }}>
            sorted
            <Dot fontSize={fa * 1.18} color={C.lime} />
            <Cursor h={fa * 0.8} f={g} style={{ marginLeft: fa * 0.06 }} />
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 4 * u, marginTop: 6 * u, flexDirection: wide ? "row" : "column", ...(wide ? {} : { alignItems: "flex-start" }) }}>
          <div
            style={{
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: (wide ? 4.4 : 5.4) * u,
              color: C.ink,
              background: C.lime,
              borderRadius: 999,
              padding: `${(wide ? 1.9 : 2.4) * u}px ${(wide ? 4.6 : 6) * u}px`,
              opacity: g >= 1094 ? 1 : 0,
              transform: `scale(${0.6 + 0.4 * pill})`,
              transformOrigin: "left center",
            }}
          >
            Book a Call
          </div>
          <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: (wide ? 3.6 : 4.4) * u, color: C.ivory, ...inn(1100) }}>alertglobaltech.com</div>
        </div>
      </div>
    </Ground>
  );
};

// ---------- Thumbnail (scene 5 frame, as a still) ----------
// `npx remotion still SeriesACinematic-16x9 --frame=<SERIES_A_CINEMATIC_THUMB_FRAME>` renders the same frame; this
// composition exists so the thumbnail can be rendered by name.

export const SERIES_A_CINEMATIC_THUMB = { fps: 30, durationInFrames: 1, width: 1920, height: 1080 } as const;
export const SeriesACinematicThumb: React.FC = () => {
  const f = SERIES_A_CINEMATIC_THUMB_FRAME - S.sorted;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <DuotoneFilter />
      <SortedBeat f={f} />
      <Grain frame={0} />
    </AbsoluteFill>
  );
};
