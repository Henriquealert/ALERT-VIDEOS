import { AbsoluteFill, Audio, Easing, Img, interpolate, random, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { WORDMARK_RATIO } from "../ui/Story";
import { C, Dot, F, tag } from "../ui/theme";

// "Day One, Sorted." Brand film for startup founders. 60 s, 24 fps, fixed copy from the brief
// (Henrique, 23 Oct 2026). Loud, comic chaos -> calm clarity -> lime end card.
// Cuts: 16x9 and 9x16 run all eight beats; the 30 s 4x5 feed cut runs beats 1, 3, 7 and 8.
// Fonts: the brief's Archivo ExtraBold and DM Mono aren't in the supplied brand set, so headlines
// use Archivo Narrow Bold caps and tags use DM Sans caps (CLAUDE.md: only the supplied fonts).
// Logo: one in the whole film, the Ink wordmark on the lime end card.
// Audio (music, SFX, voiceover) is built by scripts/make-day-one-audio.py from the same times as below.

export const DAY_ONE_16X9 = { fps: 24, durationInFrames: 1440, width: 1920, height: 1080 } as const;
export const DAY_ONE_9X16 = { fps: 24, durationInFrames: 1440, width: 1080, height: 1920 } as const;
export const DAY_ONE_FEED = { fps: 24, durationInFrames: 720, width: 1080, height: 1350 } as const;

type SceneId = "hook" | "desk" | "chaos" | "tabs" | "tangle" | "fix" | "resolve" | "end";
// Scene lengths in frames (1 beat at 120 BPM = 12 frames). Mirrored in make-day-one-audio.py.
const FULL: [SceneId, number][] = [
  ["hook", 96], // 0-4 s
  ["desk", 72], // 4-7 s
  ["chaos", 168], // 7-14 s
  ["tabs", 72], // 14-17 s
  ["tangle", 216], // 17-26 s
  ["fix", 480], // 26-46 s
  ["resolve", 144], // 46-52 s
  ["end", 192], // 52-60 s
];
const FEED: [SceneId, number][] = [
  ["hook", 96], // 0-4 s
  ["chaos", 216], // 4-13 s
  ["resolve", 168], // 13-20 s
  ["end", 240], // 20-30 s
];

const MIX_FULL = "audio/Alert Global Tech - Day One Sorted Mix.wav";
const MIX_FEED = "audio/Alert Global Tech - Day One Sorted Feed Mix.wav";
const WORDMARK_INK = "brand/alert-global-tech-wordmark-ink.png";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const smooth = Easing.bezier(0.33, 1, 0.68, 1);
const inOut = Easing.inOut(Easing.cubic);
// 0 -> 1 over `len` frames from `at`.
const prog = (f: number, at: number, len: number, easing: (t: number) => number = smooth) =>
  interpolate(f, [at, at + len], [0, 1], { ...clamp, easing });
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

// Relative layout: 9x16 keeps 250 px clear top and bottom; 4x5 feed and 16x9 have no app chrome.
const useL = () => {
  const { width: W, height: H } = useVideoConfig();
  const portrait = H > W;
  const safe = H / W > 1.7 ? 250 : 0;
  const u = Math.min(W, H) / 100;
  const side = portrait ? 8 * u : 7 * u;
  return { W, H, portrait, safe, u, side };
};

// Headline: Archivo Narrow Bold caps, tight leading, slight negative tracking.
const headline = (size: number, color: string): React.CSSProperties => ({
  fontFamily: F.numeral,
  fontWeight: 700,
  textTransform: "uppercase",
  fontSize: size,
  lineHeight: 0.9,
  letterSpacing: "-0.02em",
  color,
});
// Statement: Archivo Narrow Bold Italic caps.
const statement = (size: number, color: string): React.CSSProperties => ({
  fontFamily: F.statement,
  fontWeight: 700,
  fontStyle: "italic",
  textTransform: "uppercase",
  fontSize: size,
  lineHeight: 0.92,
  color,
});

export const DayOneSorted: React.FC<{ cut: "full" | "feed" }> = ({ cut }) => {
  const frame = useCurrentFrame();
  const plan = cut === "feed" ? FEED : FULL;
  let start = 0;
  let scene: React.ReactNode = null;
  for (const [id, len] of plan) {
    if (frame >= start && frame < start + len) {
      const Scene = SCENES[id];
      scene = <Scene f={frame - start} d={len} />;
    }
    start += len;
  }
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile(cut === "feed" ? MIX_FEED : MIX_FULL)} />
      {scene}
    </AbsoluteFill>
  );
};

type SceneProps = { f: number; d: number };

// ---------- Shared pieces ----------

// 1-bit sprites. "#" = outline (ink), "." = fill (ivory).
const ARROW = [
  "#",
  "##",
  "#.#",
  "#..#",
  "#...#",
  "#....#",
  "#.....#",
  "#......#",
  "#.......#",
  "#........#",
  "#.........#",
  "#......#####",
  "#...#..#",
  "#..##..#",
  "#.#  #..#",
  "##   #..#",
  "#     #..#",
  "      #..#",
  "       ##",
];
const HAND = [
  "    ##",
  "   #..#",
  "   #..#",
  "   #..#",
  "   #..###",
  "   #..#..###",
  "   #..#..#..##",
  " ###..#..#..#.#",
  "#..#..........#",
  "#.............#",
  " #............#",
  "  #...........#",
  "  #..........#",
  "   #.........#",
  "    #.......#",
  "    #########",
];

const SpriteG: React.FC<{ rows: string[]; h: number; x?: number; y?: number; opacity?: number }> = ({ rows, h, x = 0, y = 0, opacity = 1 }) => {
  const px = h / rows.length;
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity} shapeRendering="crispEdges">
      {rows.map((row, ry) =>
        row.split("").map((ch, rx) =>
          ch === " " ? null : (
            <rect key={`${rx}-${ry}`} x={rx * px} y={ry * px} width={px + 0.5} height={px + 0.5} fill={ch === "#" ? C.ink : C.ivory} />
          )
        )
      )}
    </g>
  );
};

const Sprite: React.FC<{ rows: string[]; h: number; style?: React.CSSProperties }> = ({ rows, h, style }) => {
  const px = h / rows.length;
  const w = Math.max(...rows.map((r) => r.length)) * px;
  return (
    <svg width={w} height={h} style={{ position: "absolute", overflow: "visible", pointerEvents: "none", ...style }}>
      <SpriteG rows={rows} h={h} />
    </svg>
  );
};

// Hairline crosshair (+).
const Crosshair: React.FC<{ x: number; y: number; size: number; color: string; opacity?: number }> = ({ x, y, size, color, opacity = 1 }) => (
  <svg width={size} height={size} style={{ position: "absolute", left: x - size / 2, top: y - size / 2, opacity }}>
    <line x1={size / 2} y1={0} x2={size / 2} y2={size} stroke={color} strokeWidth={2} />
    <line x1={0} y1={size / 2} x2={size} y2={size / 2} stroke={color} strokeWidth={2} />
  </svg>
);

// ---------- 1 · Hook (0-4 s): cursors and hands assemble the headline, then it crumbles ----------

// Letter i (spaces skipped) lands on frame HOOK_ARRIVE(i). The audio clicks use the same formula.
export const HOOK_ARRIVE = (i: number) => 8 + i * 2;
const HOOK_TRAVEL = 14;
const HOOK_CRUMBLE = 70;

const Hook: React.FC<SceneProps> = ({ f }) => {
  const L = useL();
  const lines = L.portrait ? ["NEW HIRE", "STARTS", "MONDAY"] : ["NEW HIRE", "STARTS MONDAY"];
  const fs = L.portrait ? L.W * 0.21 : L.W * 0.118;
  const total = lines.join("").replace(/ /g, "").length;
  const dotAt = HOOK_ARRIVE(total - 1) + 4;
  const dotFall = Math.max(0, f - (HOOK_CRUMBLE + total * 0.8)) / 24;
  let idx = 0;
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: L.side, top: "50%", transform: "translateY(-52%)", ...headline(fs, C.ivory) }}>
        {lines.map((line, li) => (
          <div key={li} style={{ whiteSpace: "pre" }}>
            {line.split("").map((ch, ci) => {
              if (ch === " ") return <span key={ci}> </span>;
              const i = idx++;
              return <HookLetter key={ci} ch={ch} i={i} f={f} fs={fs} />;
            })}
            {li === lines.length - 1 ? (
              <span
                style={{
                  display: "inline-block",
                  transform: `translateY(${0.5 * L.H * 2.4 * dotFall * dotFall}px) scale(${interpolate(f, [dotAt, dotAt + 4, dotAt + 8], [0, 1.4, 1], clamp)})`,
                }}
              >
                <Dot fontSize={fs} color={C.lime} />
              </span>
            ) : null}
          </div>
        ))}
      </div>
      {/* The rest of the swarm: cursors crossing without a letter */}
      {Array.from({ length: 10 }, (_, k) => {
        const s = `hook-swarm-${k}`;
        const t = prog(f, k * 3, 40 + random(`${s}-len`) * 20, inOut);
        const x0 = random(`${s}-x0`) * L.W;
        const x1 = random(`${s}-x1`) * L.W;
        const fromTop = random(`${s}-side`) > 0.5;
        const y0 = fromTop ? -80 : L.H + 40;
        const y1 = fromTop ? L.H + 40 : -80;
        return (
          <Sprite
            key={k}
            rows={k % 3 === 0 ? HAND : ARROW}
            h={fs * 0.22}
            style={{ left: lerp(x0, x1, t), top: lerp(y0, y1, t), opacity: t > 0 && t < 1 ? 1 : 0 }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const HookLetter: React.FC<{ ch: string; i: number; f: number; fs: number }> = ({ ch, i, f, fs }) => {
  const L = useL();
  const a = HOOK_ARRIVE(i);
  const ang = random(`hook-ang-${i}`) * Math.PI * 2;
  const dist = Math.max(L.W, L.H) * (0.7 + 0.4 * random(`hook-dist-${i}`));
  const dx = Math.cos(ang) * dist;
  const dy = Math.sin(ang) * dist;
  const t = prog(f, a - HOOK_TRAVEL, HOOK_TRAVEL, Easing.out(Easing.cubic));
  const leave = prog(f, a + 3, 14, Easing.in(Easing.cubic));
  const crumbleAt = HOOK_CRUMBLE + i * 0.8 + random(`hook-cr-${i}`) * 3;
  const crumbled = f >= crumbleAt;
  const visible = f >= a - HOOK_TRAVEL;
  const lx = dx * (1 - t);
  const ly = dy * (1 - t);
  const ring = prog(f, a, 8);
  const tt = Math.max(0, f - crumbleAt) / 24;
  const bs = fs * 0.2;
  return (
    <span style={{ position: "relative", display: "inline-block" }}>
      <span style={{ display: "inline-block", transform: `translate(${lx}px, ${ly}px)`, opacity: visible && !crumbled ? 1 : 0 }}>{ch}</span>
      {visible && leave < 1 ? (
        <Sprite
          rows={i % 3 === 0 ? HAND : ARROW}
          h={fs * 0.26}
          style={{ left: "55%", top: "45%", transform: `translate(${lx - dx * 0.5 * leave}px, ${ly - dy * 0.5 * leave}px)` }}
        />
      ) : null}
      {ring > 0 && ring < 1 ? (
        <div
          style={{
            position: "absolute",
            left: "55%",
            top: "45%",
            width: fs * 0.3,
            height: fs * 0.3,
            border: `${fs * 0.02}px solid ${C.lime}`,
            transform: `translate(-50%, -50%) scale(${0.3 + ring})`,
            opacity: 1 - ring,
          }}
        />
      ) : null}
      {crumbled
        ? Array.from({ length: 8 }, (_, k) => {
            const s = `hook-blk-${i}-${k}`;
            const col = k % 2;
            const row = Math.floor(k / 2);
            const fill = [C.blue, C.lime, C.ivory][Math.floor(random(`${s}-c`) * 3)];
            const vx = (random(`${s}-vx`) - 0.5) * fs * 1.2;
            return (
              <div
                key={k}
                style={{
                  position: "absolute",
                  left: col * bs * 1.05,
                  top: fs * 0.08 + row * bs * 1.05,
                  width: bs,
                  height: bs,
                  background: fill,
                  transform: `translate(${vx * tt}px, ${0.5 * L.H * 2.6 * tt * tt - fs * 0.25 * tt}px) rotate(${(random(`${s}-r`) - 0.5) * 300 * tt}deg)`,
                }}
              />
            );
          })
        : null}
    </span>
  );
};

// ---------- 2 · Picture this (4-7 s): ink frame, then a slow push-in on the empty desk ----------

const Desk: React.FC<SceneProps> = ({ f, d }) => {
  const L = useL();
  const reveal = prog(f, 12, 18);
  const push = interpolate(f, [12, d], [1, 1.16], { ...clamp, easing: Easing.out(Easing.quad) });
  const ts = L.portrait ? L.W * 0.13 : L.W * 0.072;
  const text = prog(f, 2, 10);
  const artW = L.portrait ? L.W * 1.02 : L.W * 0.86;
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: (L.W - artW) / 2,
          top: L.portrait ? L.H * 0.36 : L.H * 0.2,
          width: artW,
          opacity: reveal,
          transform: `scale(${push})`,
          transformOrigin: "55% 55%",
        }}
      >
        <svg viewBox="0 0 1600 900" width={artW} height={(artW * 900) / 1600}>
          {/* Floor hairline and crosshairs */}
          <line x1={0} y1={780} x2={1600} y2={780} stroke={C.ivory} strokeWidth={2} opacity={0.5} />
          {[
            [150, 160],
            [1480, 120],
          ].map(([x, y], k) => (
            <g key={k} stroke={C.ivory} strokeWidth={2} opacity={0.6}>
              <line x1={x - 18} y1={y} x2={x + 18} y2={y} />
              <line x1={x} y1={y - 18} x2={x} y2={y + 18} />
            </g>
          ))}
          {/* Desk */}
          <rect x={260} y={470} width={1000} height={34} fill={C.ivory} />
          <rect x={300} y={504} width={30} height={276} fill={C.blue} />
          <rect x={1190} y={504} width={30} height={276} fill={C.blue} />
          {/* Sealed laptop box */}
          <rect x={560} y={300} width={300} height={170} fill={C.blue} />
          <rect x={695} y={300} width={30} height={170} fill={C.ivory} />
          <rect x={600} y={350} width={64} height={42} rx={4} fill="none" stroke={C.ivory} strokeWidth={4} />
          <line x1={590} y1={400} x2={674} y2={400} stroke={C.ivory} strokeWidth={5} strokeLinecap="round" />
          {/* Lime sticky note */}
          <g transform="rotate(-7 1000 330)">
            <rect x={900} y={240} width={190} height={190} fill={C.lime} />
            <text x={995} y={350} textAnchor="middle" style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 46, fill: C.ink }}>
              laptop?
            </text>
          </g>
          {/* Empty chair, pushed out */}
          <rect x={1370} y={360} width={150} height={170} rx={22} fill={C.blue} />
          <rect x={1350} y={560} width={190} height={30} rx={12} fill={C.blue} />
          <rect x={1435} y={590} width={20} height={150} fill={C.ivory} />
          <line x1={1360} y1={750} x2={1530} y2={750} stroke={C.ivory} strokeWidth={10} strokeLinecap="round" />
          <circle cx={1365} cy={768} r={11} fill={C.ivory} />
          <circle cx={1525} cy={768} r={11} fill={C.ivory} />
        </svg>
      </div>
      <div
        style={{
          position: "absolute",
          left: L.side,
          top: L.safe + (L.portrait ? 12 * L.u : 9 * L.u),
          ...statement(ts, C.ivory),
          opacity: text,
          transform: `translateY(${(1 - text) * 20}px)`,
        }}
      >
        Picture this
        <Dot fontSize={ts} color={C.lime} />
      </div>
    </AbsoluteFill>
  );
};

// ---------- 3 · Chaos (7-14 s): retro desktop, dialog boxes pile up ----------

export const QUESTIONS = [
  "Who ordered the laptops?",
  "Mac or Windows?",
  "How many Microsoft 365 licences?",
  "Is the Wi-Fi password still password?",
  "Copilot or not?",
  "Which vendor was that?",
];
const COOKED = "Are we cooked?";
// Pop times on the 168-frame (7 s) scene; a longer cut scales them. Mirrored in the audio script.
export const CHAOS_MAIN = [6, 30, 50, 66, 78, 88];
export const CHAOS_FLOOD_N = 36;
export const CHAOS_FLOOD = (k: number) => 96 + 44 * Math.pow(k / CHAOS_FLOOD_N, 0.75);
export const CHAOS_COOKED = 146;

const Dialog: React.FC<{ x: number; y: number; w: number; text: string; f: number; at: number; seed: string }> = ({ x, y, w, text, f, at, seed }) => {
  if (f < at) return null;
  const p = interpolate(f, [at, at + 5], [0, 1], { ...clamp, easing: Easing.out(Easing.back(1.6)) });
  const flick = random(`${seed}-fl-${Math.floor(f / 2)}`) > 0.45 ? 1 : 0.2;
  const b = Math.max(2, w * 0.008);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: w,
        transform: `translate(-50%, -50%) scale(${0.7 + 0.3 * p})`,
        opacity: Math.min(1, p * 2),
      }}
    >
      {/* Flickering lime edge */}
      <div style={{ position: "absolute", inset: -b * 2.2, border: `${b}px solid ${C.lime}`, opacity: flick }} />
      <div style={{ border: `${b}px solid ${C.ink}`, background: C.ivory }}>
        <div
          style={{
            background: C.blue,
            height: w * 0.085,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: `0 ${w * 0.025}px`,
          }}
        >
          <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: w * 0.04, color: C.ivory }}>Day one</span>
          <span style={{ width: w * 0.045, height: w * 0.045, background: C.ivory, border: `${b}px solid ${C.ink}`, boxSizing: "border-box" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: w * 0.045, padding: `${w * 0.05}px ${w * 0.05}px ${w * 0.03}px` }}>
          <div
            style={{
              flexShrink: 0,
              width: w * 0.11,
              height: w * 0.11,
              borderRadius: "50%",
              background: C.blue,
              color: C.ivory,
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: w * 0.075,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            ?
          </div>
          <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: w * 0.06, lineHeight: 1.2, color: C.ink }}>{text}</div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: w * 0.03, padding: `0 ${w * 0.05}px ${w * 0.045}px` }}>
          {["OK", "Cancel"].map((t) => (
            <div
              key={t}
              style={{
                fontFamily: F.sans,
                fontWeight: 500,
                fontSize: w * 0.036,
                color: C.ink,
                border: `${b}px solid ${C.ink}`,
                padding: `${w * 0.008}px ${w * 0.04}px`,
                minWidth: w * 0.12,
                textAlign: "center",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const Chaos: React.FC<SceneProps> = ({ f, d }) => {
  const L = useL();
  const r = d / 168;
  const w = L.portrait ? L.W * 0.74 : L.W * 0.33;
  const band = L.H - 2 * L.safe;
  const at = (fx: number, fy: number) => ({ x: fx * L.W, y: L.safe + fy * band });
  const MAIN_POS = L.portrait
    ? [at(0.42, 0.14), at(0.58, 0.3), at(0.44, 0.46), at(0.56, 0.62), at(0.42, 0.78), at(0.6, 0.9)]
    : [at(0.26, 0.24), at(0.7, 0.2), at(0.46, 0.5), at(0.76, 0.64), at(0.25, 0.74), at(0.56, 0.84)];
  const cooked = CHAOS_COOKED * r;
  const shake = f >= cooked && f < cooked + 6 ? (random(`shake-${f}`) - 0.5) * L.u * 1.6 : 0;
  return (
    <AbsoluteFill
      style={{
        background: `linear-gradient(160deg, ${C.blue} 0%, ${C.deepBlue} 100%)`,
        overflow: "hidden",
        transform: `translate(${shake}px, ${shake * 0.6}px)`,
      }}
    >
      {/* Taskbar */}
      <div style={{ position: "absolute", left: 0, right: 0, bottom: L.safe, height: L.u * 4.4, background: C.ivory, borderTop: `3px solid ${C.ink}` }}>
        <div style={{ position: "absolute", left: L.u, top: L.u * 0.7, width: L.u * 9, height: L.u * 3, border: `3px solid ${C.ink}`, boxSizing: "border-box" }}>
          <div style={{ position: "absolute", left: L.u * 0.7, top: L.u * 0.6, width: L.u * 1.4, height: L.u * 1.4, background: C.blue }} />
        </div>
      </div>
      {QUESTIONS.map((q, k) => (
        <Dialog key={k} {...MAIN_POS[k]} w={w} text={q} f={f} at={CHAOS_MAIN[k] * r} seed={`main-${k}`} />
      ))}
      {Array.from({ length: CHAOS_FLOOD_N }, (_, k) => {
        const s = `flood-${k}`;
        return (
          <Dialog
            key={s}
            x={random(`${s}-x`) * L.W}
            y={random(`${s}-y`) * L.H}
            w={w * (0.75 + 0.35 * random(`${s}-w`))}
            text={QUESTIONS[k % QUESTIONS.length]}
            f={f}
            at={CHAOS_FLOOD(k) * r}
            seed={s}
          />
        );
      })}
      <Dialog x={L.W / 2} y={L.H / 2} w={w * 1.3} text={COOKED} f={f} at={cooked} seed="cooked" />
    </AbsoluteFill>
  );
};

// ---------- 4 · Every tab open (14-17 s): a cursor drags a blue highlight across the headline ----------

export const TABS_DRAG = [20, 56]; // drag start and end (frames). Click on the start.

const Tabs: React.FC<SceneProps> = ({ f }) => {
  const L = useL();
  const fs = L.portrait ? L.W * 0.17 : L.W * 0.098;
  const first = L.portrait ? ["ONE", "FOUNDER."] : ["ONE FOUNDER."];
  const marked = L.portrait ? ["EVERY TAB", "OPEN"] : ["EVERY TAB OPEN"];
  const drag = interpolate(f, TABS_DRAG, [0, marked.length], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const inText = prog(f, 0, 10);
  const cursorIn = prog(f, 8, 12);
  const active = Math.min(marked.length - 1, Math.floor(drag));
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Crosshair x={L.W - L.side} y={L.safe + L.side} size={L.u * 4} color={C.ivory} opacity={0.6} />
      <div
        style={{
          position: "absolute",
          left: L.side,
          top: "50%",
          transform: `translateY(-50%) translateY(${(1 - inText) * 20}px)`,
          opacity: inText,
          ...headline(fs, C.ivory),
        }}
      >
        {first.map((t) => (
          <div key={t}>{t}</div>
        ))}
        {marked.map((t, j) => {
          const q = Math.max(0, Math.min(1, drag - j));
          const last = j === marked.length - 1;
          return (
            <div key={t}>
              <span style={{ position: "relative", display: "inline-block" }}>
                <span
                  style={{
                    position: "absolute",
                    left: -fs * 0.04,
                    top: fs * 0.02,
                    bottom: -fs * 0.06,
                    width: `calc(${q * 100}% + ${fs * 0.08 * q}px)`,
                    background: C.blue,
                  }}
                />
                <span style={{ position: "relative" }}>{t}</span>
                {j === active && cursorIn > 0 ? (
                  <Sprite
                    rows={ARROW}
                    h={fs * 0.32}
                    style={{
                      left: `${q * 100}%`,
                      top: "55%",
                      transform: `translate(${(1 - cursorIn) * L.W * 0.3}px, ${(1 - cursorIn) * fs}px)`,
                    }}
                  />
                ) : null}
              </span>
              {last ? <Dot fontSize={fs} color={C.lime} /> : null}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- 5 · The tangle (17-26 s): rails knot five blocks, cursors get lost, camera pulls back ----------

type Pt = [number, number];
const bez = (p: Pt[], t: number): Pt => {
  const m = 1 - t;
  const a = m * m * m;
  const b = 3 * m * m * t;
  const c = 3 * m * t * t;
  const e = t * t * t;
  return [a * p[0][0] + b * p[1][0] + c * p[2][0] + e * p[3][0], a * p[0][1] + b * p[1][1] + c * p[2][1] + e * p[3][1]];
};
const pathD = (p: Pt[]) => `M${p[0][0]},${p[0][1]} C${p[1][0]},${p[1][1]} ${p[2][0]},${p[2][1]} ${p[3][0]},${p[3][1]}`;

const TANGLE_LABELS = ["LAPTOPS", "LICENCES", "WI-FI", "SECURITY", "TRAINING"];
const TANGLE_WORLD = {
  land: { w: 1600, h: 900, pos: [[300, 260], [800, 190], [1300, 290], [500, 650], [1130, 650]] as Pt[] },
  port: { w: 900, h: 1300, pos: [[240, 200], [670, 320], [250, 640], [660, 860], [330, 1110]] as Pt[] },
};

const Tangle: React.FC<SceneProps> = ({ f }) => {
  const L = useL();
  const world = L.portrait ? TANGLE_WORLD.port : TANGLE_WORLD.land;
  const size = 150;
  const centers: Pt[] = world.pos.map(([x, y], i) => [x, y + Math.sin(f / 18 + i * 1.7) * 8]);
  const pairs: [number, number][] = [];
  for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) pairs.push([i, j]);
  for (let i = 0; i < 4; i++) pairs.push([i, (i + 2) % 5]);
  const spread = world.w * 0.45;
  const rails = pairs.map(([i, j], k): Pt[] => {
    const s = `rail-${k}`;
    const a = centers[i];
    const b = centers[j];
    return [
      a,
      [a[0] + (random(`${s}-1x`) - 0.5) * spread * 2, a[1] + (random(`${s}-1y`) - 0.5) * spread * 2],
      [b[0] + (random(`${s}-2x`) - 0.5) * spread * 2, b[1] + (random(`${s}-2y`) - 0.5) * spread * 2],
      b,
    ];
  });
  // Camera: starts close on LICENCES, pulls back to the whole knot.
  const pull = prog(f, 0, 168, inOut);
  const zoom = lerp(2.1, 1, pull);
  const focus: Pt = [lerp(world.pos[1][0], world.w / 2, pull), lerp(world.pos[1][1], world.h / 2, pull)];
  const fills = [C.lime, C.blue, "none", "url(#tangle-grad)", C.ivory];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg
        viewBox={`0 0 ${world.w} ${world.h}`}
        width={L.W}
        height={L.H - 2 * L.safe}
        style={{ position: "absolute", left: 0, top: L.safe, overflow: "visible" }}
      >
        <defs>
          <linearGradient id="tangle-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={C.blue} />
            <stop offset="60%" stopColor={C.sky} />
            <stop offset="100%" stopColor={C.skyLight} />
          </linearGradient>
        </defs>
        <g transform={`translate(${world.w / 2} ${world.h / 2}) scale(${zoom}) translate(${-focus[0]} ${-focus[1]})`}>
          {centers.map(([x, y], i) => (
            <g key={i}>
              <rect
                x={x - size / 2}
                y={y - size / 2}
                width={size}
                height={size}
                fill={fills[i]}
                stroke={fills[i] === "none" ? C.ivory : "none"}
                strokeWidth={4}
              />
              <text
                x={x}
                y={y + size / 2 + 40}
                textAnchor="middle"
                style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 26, letterSpacing: "0.12em", fill: C.ivory }}
              >
                {TANGLE_LABELS[i]}
              </text>
            </g>
          ))}
          {rails.map((p, k) => (
            <path
              key={k}
              d={pathD(p)}
              fill="none"
              stroke={C.blue}
              strokeWidth={k % 3 === 0 ? 2 : 4}
              pathLength={1}
              strokeDasharray="1 1"
              strokeDashoffset={1 - prog(f, 4 + k * 5, 40)}
            />
          ))}
          {rails.slice(0, 8).map((p, k) => {
            const [x, y] = bez(p, 0.3 + 0.4 * random(`cross-${k}`));
            const o = prog(f, 30 + k * 6, 10);
            return (
              <g key={k} stroke={C.ivory} strokeWidth={2} opacity={o}>
                <line x1={x - 16} y1={y} x2={x + 16} y2={y} />
                <line x1={x} y1={y - 16} x2={x} y2={y + 16} />
              </g>
            );
          })}
          {/* Lost cursors: wander along a rail, stop, turn back */}
          {[0, 3, 6, 9, 11, 13].map((k, n) => {
            const t = 0.5 + 0.42 * Math.sin(f * (0.025 + 0.012 * random(`lost-${n}-s`)) + random(`lost-${n}-p`) * 6.28);
            const [x, y] = bez(rails[k], t);
            return <SpriteG key={n} rows={n % 2 ? HAND : ARROW} h={34} x={x} y={y} opacity={prog(f, 20 + n * 8, 8)} />;
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

// ---------- 6 · The fix (26-46 s): Soft Ivory, calm UI cards ----------

const QUOTE_ITEMS = ["Dell or Apple laptops", "Microsoft 365", "Copilot", "Ubiquiti Wi-Fi", "Fortinet firewall"];
const CHECKS = ["Sourced through TD SYNNEX", "Configured", "Licences assigned", "Certiport training booked"];
// Local frames. Ticks are mirrored in the audio script.
export const FIX_AT = { message: 12, quote: 96, checklist: 216, ready: 396 };
export const FIX_TICKS = [252, 288, 324, 360];
const MESSAGE = "We're hiring six people this quarter.";
const hairline = `2px solid ${C.ink}22`;

const Card: React.FC<{ p: number; children: React.ReactNode; style?: React.CSSProperties }> = ({ p, children, style }) => (
  <div
    style={{
      background: C.ivory,
      border: hairline,
      borderRadius: 22,
      opacity: p,
      transform: `translateY(${(1 - p) * 40}px)`,
      ...style,
    }}
  >
    {children}
  </div>
);

const Fix: React.FC<SceneProps> = ({ f }) => {
  const L = useL();
  const u = L.u * (L.portrait ? 1.22 : 1.3); // larger cards, centred in the frame
  const pMsg = prog(f, FIX_AT.message, 24);
  const pQuote = prog(f, FIX_AT.quote, 24);
  const pCheck = prog(f, FIX_AT.checklist, 24);
  const pReady = prog(f, FIX_AT.ready, 24);
  const typed = Math.round(interpolate(f, [FIX_AT.message + 14, FIX_AT.message + 62], [0, MESSAGE.length], clamp));
  const body = (size: number, weight = 400): React.CSSProperties => ({ fontFamily: F.sans, fontWeight: weight, fontSize: size * u, color: C.ink });
  const pad = 2.6 * u;
  const cell: React.CSSProperties = { padding: `${1.1 * u}px 0`, borderTop: hairline };

  const message = (
    <Card p={pMsg} style={{ padding: pad }}>
      <div style={{ ...tag(1.6 * u, C.ink), opacity: 0.6, marginBottom: 1.4 * u }}>Message</div>
      <div style={{ display: "flex", alignItems: "center", gap: 1.6 * u }}>
        <div style={{ width: 2.4 * u, height: 2.4 * u, borderRadius: "50%", background: C.blue, flexShrink: 0 }} />
        <div style={{ ...body(3.2, 500), minHeight: 3.9 * u }}>{MESSAGE.slice(0, typed)}</div>
      </div>
    </Card>
  );

  const quote = (
    <Card p={pQuote} style={{ padding: pad }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 1.4 * u }}>
        <div style={{ ...tag(1.6 * u, C.ink), opacity: 0.6 }}>Quote</div>
        <div style={{ ...tag(1.6 * u, C.ink), opacity: 0.6 }}>One supplier</div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", columnGap: 4 * u, ...body(2.4) }}>
        {[["Item", "Qty", "Price"], ...QUOTE_ITEMS.map((it) => [it, "[00]", "[00]"]), ["Total", "", "[00]"]].map((row, ri) => {
          const p = ri === 0 ? 1 : prog(f, FIX_AT.quote + 24 + ri * 12, 14);
          const strong = ri === 0 || ri === QUOTE_ITEMS.length + 1;
          return row.map((c, ci) => (
            <div
              key={`${ri}-${ci}`}
              style={{
                ...cell,
                ...(ri === 0 ? { ...tag(1.5 * u, C.ink), opacity: 0.6, borderTop: "none" } : {}),
                fontWeight: strong && ri !== 0 ? 600 : undefined,
                textAlign: ci === 0 ? "left" : "right",
                opacity: ri === 0 ? 0.6 : p,
                transform: `translateY(${(1 - p) * 10}px)`,
              }}
            >
              {c}
            </div>
          ));
        })}
      </div>
    </Card>
  );

  const checklist = (
    <Card p={pCheck} style={{ padding: pad }}>
      <div style={{ ...tag(1.6 * u, C.ink), opacity: 0.6, marginBottom: 1.6 * u }}>Setup</div>
      {CHECKS.map((t, i) => {
        const done = prog(f, FIX_TICKS[i], 8, Easing.out(Easing.back(2)));
        const box = 3.2 * u;
        return (
          <div key={t} style={{ display: "flex", alignItems: "center", gap: 1.8 * u, padding: `${1.1 * u}px 0`, borderTop: i ? hairline : "none" }}>
            <div style={{ position: "relative", width: box, height: box, flexShrink: 0, border: `2px solid ${C.ink}`, borderRadius: 8, boxSizing: "border-box" }}>
              <div
                style={{
                  position: "absolute",
                  inset: -2,
                  borderRadius: 8,
                  background: C.lime,
                  border: `2px solid ${C.ink}`,
                  transform: `scale(${done})`,
                }}
              >
                <svg viewBox="0 0 24 24" width="100%" height="100%">
                  <polyline points="6,12.5 10.5,17 18,8" fill="none" stroke={C.ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </div>
            <div style={{ ...body(2.6, 500), opacity: 0.55 + 0.45 * Math.min(1, done) }}>{t}</div>
          </div>
        );
      })}
    </Card>
  );

  const rs = 4.6 * u;
  const ready = (
    <Card p={pReady} style={{ background: C.ink, border: "none", padding: `${2.2 * u}px ${pad}px`, alignSelf: "flex-start" }}>
      <div style={headline(rs, C.ivory)}>
        Ready for Monday
        <Dot fontSize={rs} color={C.lime} />
      </div>
    </Card>
  );

  const corner = prog(f, 30, 40);
  return (
    <AbsoluteFill style={{ background: C.ivory, overflow: "hidden" }}>
      {/* Quarter-round in blue, bottom-right, and a hairline crosshair: the calm scene's two elements */}
      <div
        style={{
          position: "absolute",
          right: -18 * u * (1 - corner),
          bottom: L.portrait ? 0 : -18 * u * (1 - corner),
          width: 18 * u,
          height: 18 * u,
          background: C.blue,
          borderTopLeftRadius: "100%",
        }}
      />
      <Crosshair x={L.W - L.side} y={L.safe + L.side} size={4 * u} color={C.ink} opacity={0.5 * corner} />
      {L.portrait ? (
        <div
          style={{
            position: "absolute",
            left: L.side * 0.75,
            right: L.side * 0.75,
            top: L.H / 2,
            transform: "translateY(-50%)",
            display: "flex",
            flexDirection: "column",
            gap: 2.4 * u,
          }}
        >
          {message}
          {quote}
          {checklist}
          {ready}
        </div>
      ) : (
        <div
          style={{
            position: "absolute",
            left: L.side + L.u * 2,
            right: L.side + L.u * 12,
            top: "50%",
            transform: "translateY(-50%)",
            display: "flex",
            alignItems: "flex-start",
            gap: 4 * u,
          }}
        >
          <div style={{ flex: 1.15, display: "flex", flexDirection: "column", gap: 3 * u }}>
            {message}
            {quote}
          </div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 3 * u }}>
            {checklist}
            {ready}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

// ---------- 7 · Resolution (46-52 s): lines snap into stepped blocks, the arrow rises ----------

export const RESOLVE_AT = { snap: 24, blocks: 48, arrow: 76 };

const Resolve: React.FC<SceneProps> = ({ f }) => {
  const L = useL();
  const band = L.H - 2 * L.safe;
  const stepW = L.portrait ? L.W * 0.22 : L.W * 0.1;
  const heights = (L.portrait ? [0.14, 0.26, 0.38] : [0.18, 0.33, 0.48]).map((h) => h * band);
  const base = L.H - L.safe - band * 0.12;
  const x0 = L.W / 2 - 1.5 * stepW;
  // Five tangled curves -> block tops (3) and the baseline (2).
  const targets: [Pt, Pt][] = [
    [[x0, base - heights[0]], [x0 + stepW, base - heights[0]]],
    [[x0 + stepW, base - heights[1]], [x0 + 2 * stepW, base - heights[1]]],
    [[x0 + 2 * stepW, base - heights[2]], [x0 + 3 * stepW, base - heights[2]]],
    [[x0, base], [x0 + 1.5 * stepW, base]],
    [[x0 + 1.5 * stepW, base], [x0 + 3 * stepW, base]],
  ];
  const snap = prog(f, RESOLVE_AT.snap, 12, Easing.out(Easing.back(1.3)));
  const fade = 1 - prog(f, RESOLVE_AT.blocks + 18, 12);
  const curves = targets.map(([a, b], k): Pt[] => {
    const s = `resolve-${k}`;
    const rnd = (n: string, span: number, c: number) => c + (random(`${s}-${n}`) - 0.5) * span;
    const tangled: Pt[] = [
      [rnd("0x", L.W * 0.6, L.W / 2), rnd("0y", band * 0.5, L.H / 2)],
      [rnd("1x", L.W * 1.2, L.W / 2), rnd("1y", band * 0.9, L.H / 2)],
      [rnd("2x", L.W * 1.2, L.W / 2), rnd("2y", band * 0.9, L.H / 2)],
      [rnd("3x", L.W * 0.6, L.W / 2), rnd("3y", band * 0.5, L.H / 2)],
    ];
    const straight: Pt[] = [a, [lerp(a[0], b[0], 1 / 3), a[1]], [lerp(a[0], b[0], 2 / 3), b[1]], b];
    return tangled.map((p, i) => [lerp(p[0], straight[i][0], snap), lerp(p[1], straight[i][1], snap)] as Pt);
  });
  const fills = [C.lime, C.blue, "none"];
  // Arrow: bottom-left, past the blocks, out top-right.
  const A = L.portrait ? L.W * 0.36 : L.H * 0.42;
  const fly = prog(f, RESOLVE_AT.arrow, 56, Easing.inOut(Easing.quad));
  const ax = lerp(x0 - A * 0.9, L.W + A, fly);
  const ay = lerp(L.H + A * 0.6, -A, fly);
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <svg width={L.W} height={L.H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="arrow-grad" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor={C.blue} />
            <stop offset="65%" stopColor={C.sky} />
            <stop offset="100%" stopColor={C.skyLight} />
          </linearGradient>
        </defs>
        {curves.map((p, k) => (
          <path key={k} d={pathD(p)} fill="none" stroke={C.blue} strokeWidth={4} opacity={fade} />
        ))}
        {heights.map((h, i) => {
          const g = prog(f, RESOLVE_AT.blocks + i * 6, 14);
          const x = x0 + i * stepW;
          return g > 0 ? (
            <rect
              key={i}
              x={x + (fills[i] === "none" ? 3 : 0)}
              y={base - h * g + (fills[i] === "none" ? 3 : 0)}
              width={stepW - (fills[i] === "none" ? 6 : 0)}
              height={Math.max(0, h * g - (fills[i] === "none" ? 6 : 0))}
              fill={fills[i]}
              stroke={fills[i] === "none" ? C.ivory : "none"}
              strokeWidth={6}
            />
          ) : null;
        })}
        {fly > 0 && fly < 1 ? (
          <g transform={`translate(${ax} ${ay}) rotate(45) scale(${A / 100})`}>
            <polygon points="-17,50 -17,-5 -45,-5 0,-50 45,-5 17,-5 17,50" fill="url(#arrow-grad)" />
          </g>
        ) : null}
      </svg>
    </AbsoluteFill>
  );
};

// ---------- 8 · End card (52-60 s): lime wipe, Ink wordmark, DAY ONE, sorted, Request a Quote ----------

export const END_WIPE = 12; // whoosh under the wipe, frames 0-12

const End: React.FC<SceneProps> = ({ f }) => {
  const L = useL();
  const u = L.u;
  const wipe = prog(f, 0, END_WIPE, inOut);
  const fs = L.portrait ? L.W * 0.2 : L.W * 0.098;
  const pHead = prog(f, 16, 14);
  const pSorted = prog(f, 28, 16);
  const pCta = prog(f, 46, 14);
  const pUrl = prog(f, 54, 14);
  const pMark = prog(f, 12, 14);
  const wmW = (L.portrait ? 20 : 15) * u;
  const blk = (L.portrait ? 7 : 6) * u;
  const rise = (p: number): React.CSSProperties => ({ opacity: p, transform: `translateY(${(1 - p) * 24}px)` });
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: wipe * L.W, background: C.lime }} />
      <Img
        src={staticFile(WORDMARK_INK)}
        style={{ position: "absolute", left: L.side, top: L.safe + L.side * 0.8, width: wmW, height: wmW / WORDMARK_RATIO, opacity: pMark }}
      />
      <Crosshair x={L.W - L.side} y={L.safe + L.side * 0.8 + wmW / WORDMARK_RATIO / 2} size={4 * u} color={C.ink} opacity={pMark} />
      <div
        style={{
          position: "absolute",
          left: L.side,
          top: L.portrait ? L.safe + (L.H - 2 * L.safe) * 0.24 : L.H * 0.3,
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}
      >
        <div style={{ display: "flex", flexDirection: L.portrait ? "column" : "row", alignItems: L.portrait ? "flex-start" : "baseline", gap: fs * 0.22 }}>
          <div style={{ ...headline(fs, C.ink), ...rise(pHead) }}>Day one,</div>
          <div style={{ fontFamily: F.accent, fontStyle: "italic", fontWeight: 400, fontSize: fs * 1.12, lineHeight: 0.9, color: C.ink, ...rise(pSorted) }}>
            sorted
            <Dot fontSize={fs} color={C.ink} />
          </div>
        </div>
        <div
          style={{
            marginTop: (L.portrait ? 9 : 6) * u,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: (L.portrait ? 4.6 : 3.8) * u,
            color: C.lime,
            background: C.ink,
            borderRadius: 999,
            padding: `${1.9 * u}px ${4.4 * u}px`,
            ...rise(pCta),
          }}
        >
          Request a Quote
        </div>
        <div style={{ marginTop: 2.6 * u, fontFamily: F.sans, fontWeight: 500, fontSize: (L.portrait ? 3.4 : 2.6) * u, color: C.ink, ...rise(pUrl) }}>
          alertglobaltech.com
        </div>
      </div>
      {/* Stepped blocks, small, bottom-right: ink, blue, outline */}
      {[C.ink, C.blue, "none"].map((fill, i) => {
        const p = prog(f, 22 + i * 5, 12);
        const h = blk * (i + 1);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: L.W - L.side - 3 * blk + i * blk,
              top: L.H - L.safe - L.side - h * p,
              width: blk,
              height: h * p,
              background: fill === "none" ? "transparent" : fill,
              border: fill === "none" ? `4px solid ${C.ink}` : "none",
              boxSizing: "border-box",
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const SCENES: Record<SceneId, React.FC<SceneProps>> = {
  hook: Hook,
  desk: Desk,
  chaos: Chaos,
  tabs: Tabs,
  tangle: Tangle,
  fix: Fix,
  resolve: Resolve,
  end: End,
};
