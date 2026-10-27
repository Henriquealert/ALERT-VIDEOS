import { AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { C, Dot, F } from "../ui/theme";

// "Series A, sorted." promo — the Series A Compliance bundle (the short brand cut; the 86 s explainer is SeriesASorted.tsx). 30 s, 30 fps, 16:9 and 4:5 (same scenes, re-laid out).
// Fixed copy from Henrique's brief (24 Oct 2026); no other words on screen, so it works muted. The voiceover
// (ElevenLabs "Everett", added on request) reads only the on-screen copy.
// Pacing, kinetic type and collage follow the LinkedIn reference; the look is the brand's: Deep Ink and Acid
// Lime grounds alternate, Soft Ivory UI cards, Electric Blue only in the beam. The device table is illustrative.
// One logo in the whole video: the lockup on the end card.
// Brand fonts only (CLAUDE.md): the brief's Archivo ExtraBold kinetic type is set in DM Sans Bold, as in
// Security, sorted. Halftone art (grain baked in): scripts/make-series-a-cutouts.py.
// Music: scripts/make-series-a-promo-audio.py, 120 BPM, 1 beat = 15 frames. Every cut and landing below is on a beat,
// and the hit frames at the top of that script must match the constants here.

export const SERIES_A_PROMO_16X9 = { fps: 30, durationInFrames: 900, width: 1920, height: 1080 } as const;
export const SERIES_A_PROMO_4X5 = { ...SERIES_A_PROMO_16X9, width: 1080, height: 1350 } as const;

const B = 15; // one beat at 120 BPM
// Scene starts: 0, 4, 9, 14, 19, 25 s; end 30 s.
const SCENES = [0, 120, 270, 420, 570, 750, 900];
// Hits (frames within the scene), mirrored in the audio script.
const S1_WORDS = [0, 2 * B, 4 * B]; // SOC 2 / IS / COMING
const S2_BOX = 4 * B; // highlight box wipes in
const S2_STAMP = 7 * B; // stamp hits the cabinet
const S3_CARDS = [B, 2 * B, 3 * B, 4 * B];
const S4_WORDS = [0, B, 2 * B, 4 * B, 5 * B, 6 * B]; // DAY / ONE: / READY / LAST / DAY: / WIPED
const S4_FLIP = 6 * B;
const S5_ITEMS = [3, 4, 5, 8, 9, 10].map((b) => b * B); // on the beats the voiceover names them

// Music + voiceover, mixed by scripts/mix-series-a-promo-voiceover.py (lines land on the scene beats).
const MUSIC = "audio/Alert Global Tech - Series A Sorted Promo Mix.wav";
const ART = (n: string) => staticFile(`art/series-a-${n}.png`);
const RATIO = { "laptop-open": 1200 / 900, "laptop-closed": 1066 / 535, cabinet: 672 / 1186, stamp: 506 / 794 } as const;
type Art = keyof typeof RATIO;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, easing = Easing.out(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing });

const useL = () => {
  const { width: W, height: H, fps } = useVideoConfig();
  const u = Math.min(W, H) / 100;
  return { W, H, u, fps, wide: W > H, side: 7 * u };
};

export const SeriesAPromo: React.FC = () => {
  const frame = useCurrentFrame();
  const scenes = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile(MUSIC)} />
      {scenes.map((Scene, i) =>
        frame >= SCENES[i] && frame < SCENES[i + 1] ? <Scene key={i} f={frame - SCENES[i]} /> : null,
      )}
    </AbsoluteFill>
  );
};

type SceneProps = { f: number };

// ---------- Shared pieces ----------

const Ground: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <AbsoluteFill style={{ background: color, overflow: "hidden" }}>{children}</AbsoluteFill>
);

// Kinetic headline: heavy, uppercase, tight leading.
const kinetic = (size: number, color: string): React.CSSProperties => ({
  fontFamily: F.headline,
  fontWeight: 700,
  fontSize: size,
  lineHeight: 0.88,
  letterSpacing: "-0.035em",
  textTransform: "uppercase",
  color,
  whiteSpace: "nowrap",
});

// A word that lands on its beat: snaps in oversized and settles.
const Land: React.FC<{ f: number; at: number; children: React.ReactNode; gap?: boolean }> = ({ f, at, children, gap }) => {
  const { fps } = useL();
  const p = spring({ frame: f - at, fps, config: { damping: 14, stiffness: 320 } });
  return (
    <span
      style={{
        display: "inline-block",
        marginLeft: gap ? "0.24em" : 0,
        opacity: f >= at ? 1 : 0,
        transform: `scale(${1.35 - 0.35 * p})`,
      }}
    >
      {children}
    </span>
  );
};

// Halftone cut-out, placed by its centre, with a slow drift and spin.
const Cutout: React.FC<{ art: Art; x: number; y: number; w: number; rot: number; z?: number; opacity?: number }> = ({
  art,
  x,
  y,
  w,
  rot,
  z,
  opacity = 1,
}) => {
  const h = w / RATIO[art];
  return (
    <Img
      src={ART(art)}
      style={{ position: "absolute", left: x - w / 2, top: y - h / 2, width: w, height: h, transform: `rotate(${rot}deg)`, zIndex: z, opacity }}
    />
  );
};

// Lime disc stamped "SOC 2" in ink, like a coin. `flip` (0..1) squashes it edge-on as it spins in.
const Disc: React.FC<{ x: number; y: number; d: number; rot: number; flip?: number; z?: number }> = ({ x, y, d, rot, flip = 1, z }) => (
  <div
    style={{
      position: "absolute",
      left: x - d / 2,
      top: y - d / 2,
      width: d,
      height: d,
      borderRadius: "50%",
      background: C.lime,
      border: `${d * 0.025}px solid ${C.ink}`,
      boxSizing: "border-box",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      transform: `rotate(${rot}deg) scaleX(${Math.max(0.08, flip)})`,
      zIndex: z,
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: d * 0.07,
        borderRadius: "50%",
        border: `${d * 0.012}px solid ${C.ink}`,
      }}
    />
    <div style={{ fontFamily: F.headline, fontWeight: 700, fontSize: d * 0.27, letterSpacing: "-0.02em", color: C.ink }}>SOC 2</div>
  </div>
);

// Thin line arrow, bottom-left of the end card (as in the "Data, sorted." end card).
const LineArrow: React.FC<{ x: number; y: number; w: number; color: string; p: number }> = ({ x, y, w, color, p }) => {
  const h = w * 0.375;
  return (
    <svg width={w} height={h} viewBox="0 0 96 36" style={{ position: "absolute", left: x, top: y, opacity: p }}>
      <path
        d="M3,18 H93 M76,3 L93,18 L76,33"
        fill="none"
        stroke={color}
        strokeWidth={3}
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        strokeDasharray={1}
        strokeDashoffset={1 - p}
      />
    </svg>
  );
};

// The brand beam: a thin blue → sky line down the centre with a soft blue glow.
const Beam: React.FC<{ rise: number; dim?: number }> = ({ rise, dim = 1 }) => {
  const { W, H, u } = useL();
  const glow = 11 * u;
  return (
    <div
      style={{
        position: "absolute",
        left: W / 2 - glow / 2,
        top: 0,
        width: glow,
        height: H,
        transformOrigin: "top",
        transform: `scaleY(${rise})`,
        opacity: dim,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `linear-gradient(180deg, transparent 0%, ${C.blue} 45%, transparent 100%)`,
          opacity: 0.5,
          filter: `blur(${2.2 * u}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: glow / 2 - 2,
          top: 0,
          width: 4,
          height: H,
          background: `linear-gradient(180deg, transparent 0%, ${C.skyLight} 25%, ${C.sky} 50%, ${C.blue} 75%, transparent 100%)`,
        }}
      />
    </div>
  );
};

// ---------- Scene 1 (0–4 s) · Deep Ink · SOC 2 / IS / COMING ----------

// Where the collage settles (fractions of the frame), and from which side it tumbles in.
const TUMBLE = {
  wide: [
    { k: "laptop-open", x: 0.13, y: 0.24, w: 0.22, rot: -14, from: [-0.35, -0.3], at: 62, z: 0 },
    { k: "laptop-closed", x: 0.88, y: 0.83, w: 0.19, rot: 12, from: [1.35, 1.3], at: 66, z: 2 },
    { k: "disc", x: 0.87, y: 0.22, w: 0.1, rot: 14, from: [1.2, -0.4], at: 70, z: 2 },
    { k: "disc", x: 0.12, y: 0.8, w: 0.09, rot: -10, from: [-0.25, 1.4], at: 75, z: 2 },
    { k: "disc", x: 0.7, y: 0.5, w: 0.07, rot: 22, from: [1.3, 0.6], at: 82, z: 0 },
  ],
  tall: [
    { k: "laptop-open", x: 0.24, y: 0.17, w: 0.5, rot: -14, from: [-0.5, -0.3], at: 62, z: 0 },
    { k: "laptop-closed", x: 0.74, y: 0.85, w: 0.5, rot: 12, from: [1.5, 1.3], at: 66, z: 2 },
    { k: "disc", x: 0.8, y: 0.16, w: 0.22, rot: 14, from: [1.3, -0.3], at: 70, z: 2 },
    { k: "disc", x: 0.18, y: 0.84, w: 0.18, rot: -10, from: [-0.3, 1.3], at: 75, z: 2 },
    { k: "disc", x: 0.86, y: 0.52, w: 0.13, rot: 22, from: [1.3, 0.5], at: 82, z: 0 },
  ],
} as const;

const Scene1: React.FC<SceneProps> = ({ f }) => {
  const { W, H, wide } = useL();
  const fs = Math.min((W * 0.7) / 4.55, H * 0.29); // COMING plus its dot fills ~70% of the width
  const push = interpolate(f, [0, 120], [1, 1.05], clamp);
  return (
    <Ground color={C.ink}>
      {(wide ? TUMBLE.wide : TUMBLE.tall).map((t, i) => {
        if (f < t.at - 14) return null;
        const p = ease(f, t.at - 14, t.at, Easing.out(Easing.quad));
        const sx = t.from[0] * W + (t.x * W - t.from[0] * W) * p;
        const sy = t.from[1] * H + (t.y * H - t.from[1] * H) * p;
        const drift = Math.sin((f + i * 20) / 22) * 0.008 * H;
        const rot = t.rot + 160 * (1 - p) * (i % 2 ? 1 : -1) + (f - t.at) * 0.12 * (i % 2 ? -1 : 1);
        const w = t.w * W;
        if (t.k === "disc") {
          const flip = Math.abs(Math.cos((1 - p) * Math.PI * 2.5));
          return <Disc key={i} x={sx} y={sy + drift} d={w} rot={rot * 0.4} flip={flip} z={t.z} />;
        }
        return <Cutout key={i} art={t.k} x={sx} y={sy + drift} w={w} rot={rot} z={t.z} />;
      })}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", zIndex: 1 }}>
        <div style={{ ...kinetic(fs, C.lime), textAlign: "center", transform: `scale(${push})` }}>
          <div>
            <Land f={f} at={S1_WORDS[0]}>
              SOC 2
            </Land>
          </div>
          <div>
            <Land f={f} at={S1_WORDS[1]}>
              IS
            </Land>
          </div>
          <div>
            <Land f={f} at={S1_WORDS[2]}>
              COMING
              <Dot fontSize={fs} color={C.lime} />
            </Land>
          </div>
        </div>
      </AbsoluteFill>
    </Ground>
  );
};

// ---------- Scene 2 (4–9 s) · Acid Lime · the proof sentence, cabinet and stamp ----------

const LINE1 = "Your first enterprise customer wants proof every laptop is";
const BOXED = "managed and secure";

const Scene2: React.FC<SceneProps> = ({ f }) => {
  const { W, H, u, wide } = useL();
  const fs = wide ? 6.0 * u : 6.4 * u;
  const typed = Math.floor(Math.max(0, (f - 3) * 1.15));
  const vis = LINE1.slice(0, typed);
  const rest = LINE1.slice(typed);
  const wipe = ease(f, S2_BOX, S2_BOX + 8, Easing.inOut(Easing.cubic));
  // Cabinet: rises into place bottom-centre, then squashes when the stamp lands.
  const cabH = wide ? H * 0.5 : H * 0.48;
  const cabW = cabH * RATIO.cabinet;
  const cabRise = ease(f, 0, 12);
  const hit = f >= S2_STAMP ? interpolate(f, [S2_STAMP, S2_STAMP + 3, S2_STAMP + 12], [0, 1, 0], clamp) : 0;
  const cabTop = H - cabH * (wide ? 0.8 : 0.86) + (1 - cabRise) * cabH;
  const cx = W / 2;
  // Stamp: swings in from the right to hover beside the cabinet, winds up, then slams onto its top on the beat.
  const stH = cabH * 0.46;
  const stW = stH * RATIO.stamp;
  const restY = cabTop + cabH * 0.07 - stH; // base on the cabinet top
  const hoverX = cx + cabW * (wide ? 1.35 : 1.15);
  const hoverY = restY - stH * 0.05;
  const enter = ease(f, 40, 70, Easing.out(Easing.cubic));
  const lift = ease(f, 70, S2_STAMP - 4, Easing.out(Easing.quad));
  const slam = ease(f, S2_STAMP - 4, S2_STAMP, Easing.in(Easing.quad));
  const wx = W + stW + (hoverX - W - stW) * enter;
  const wy = hoverY - stH * 0.15 * lift;
  const sx = wx + (cx - wx) * slam;
  const sy = wy + (restY - wy) * slam;
  const srot = (30 * (1 - enter) + 10 + 6 * lift) * (1 - slam);
  const after = f - S2_STAMP;
  const settle = after > 0 ? -Math.exp(-after / 4) * Math.abs(Math.sin(after / 2.2)) * 1.2 * u : 0;
  // Impact ticks around the stamp's base.
  const burst = after >= 0 ? ease(f, S2_STAMP, S2_STAMP + 8) : 0;
  return (
    <Ground color={C.lime}>
      <div
        style={{
          position: "absolute",
          left: (W - (wide ? W * 0.94 : W * 0.86)) / 2,
          width: wide ? W * 0.94 : W * 0.86,
          top: wide ? H * 0.08 : H * 0.1,
          textAlign: "center",
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: fs,
          lineHeight: 1.18,
          letterSpacing: "-0.015em",
          color: C.ink,
        }}
      >
        <div>
          {vis}
          <span style={{ color: "transparent" }}>{rest}</span>
        </div>
        <div style={{ marginTop: "0.18em" }}>
          <span style={{ position: "relative", display: "inline-block", padding: "0.02em 0.28em 0.08em", color: "transparent" }}>
            {BOXED}
            <span
              style={{
                position: "absolute",
                inset: 0,
                padding: "0.02em 0.28em 0.08em",
                background: C.ink,
                color: C.lime,
                borderRadius: "0.12em",
                whiteSpace: "nowrap",
                clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
              }}
            >
              {BOXED}
            </span>
          </span>
          {wipe >= 1 ? <Dot fontSize={fs} color={C.blue} /> : null}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: cx - cabW / 2,
          top: cabTop,
          width: cabW,
          height: cabH,
          transformOrigin: "bottom center",
          transform: `scale(${1 + 0.02 * hit}, ${1 - 0.035 * hit})`,
        }}
      >
        <Img src={ART("cabinet")} style={{ width: cabW, height: cabH }} />
      </div>
      {burst > 0 && burst < 1 ? (
        <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
          {[-150, -125, -100, -80, -55, -30].map((a, i) => {
            const r0 = stW * (0.62 + 0.25 * burst);
            const r1 = r0 + 3 * u * (1 - burst * 0.6);
            const ox = sx;
            const oy = restY + stH * 0.98;
            const rad = (a * Math.PI) / 180;
            return (
              <line
                key={i}
                x1={ox + Math.cos(rad) * r0}
                y1={oy + Math.sin(rad) * r0 * 0.6}
                x2={ox + Math.cos(rad) * r1}
                y2={oy + Math.sin(rad) * r1 * 0.6}
                stroke={C.ink}
                strokeWidth={0.5 * u}
                strokeLinecap="round"
                opacity={1 - burst}
              />
            );
          })}
        </svg>
      ) : null}
      {f >= 40 ? (
        <Img
          src={ART("stamp")}
          style={{
            position: "absolute",
            left: sx - stW / 2,
            top: sy + settle,
            width: stW,
            height: stH,
            transform: `rotate(${srot}deg)`,
          }}
        />
      ) : null}
    </Ground>
  );
};

// ---------- Scene 3 (9–14 s) · Acid Lime · device cards stack; a laptop pushes through ----------

const HEAD = ["Device", "Team", "Encrypted", "Managed", "Status"];
const DEVICES = [
  ["Dell Pro 14", "Engineering"],
  ["HP EliteBook 6", "Sales"],
  ["Dell Pro 14", "Finance"],
  ["HP EliteBook 8", "Operations"],
];
const COLS = [1.6, 1.3, 1, 1, 1.2];

const Scene3: React.FC<SceneProps> = ({ f }) => {
  const { W, H, u, side, wide } = useL();
  const cardW = wide ? 146 * u : W - 2 * side * 0.6;
  const fs = wide ? 3.6 * u : 2.75 * u;
  const cardH = fs * (wide ? 3.1 : 3.4);
  const gap = fs * 0.55;
  const headH = fs * 2;
  const stackH = headH + DEVICES.length * (cardH + gap);
  const left = (W - cardW) / 2;
  const top0 = (H - stackH) / 2;
  const total = COLS.reduce((a, b) => a + b, 0);
  const pad = fs * (wide ? 1.1 : 0.8);
  const col = (c: number) => ({ width: `${(COLS[c] / total) * 100}%`, flexShrink: 0 });
  // Laptop pushes up through the stack, between the second and third cards.
  const lp = ease(f, 5 * B, 10 * B, Easing.inOut(Easing.quad));
  const lw = wide ? W * 0.36 : W * 0.66;
  const ly = H + lw * 0.5 - (H * 1.1 + lw) * lp;
  const lx = W * (wide ? 0.66 : 0.6);
  const lrot = -16 + 22 * lp;
  const nudge = (i: number) => {
    // Cards part slightly as the laptop passes their row.
    const rowY = top0 + headH + i * (cardH + gap) + cardH / 2;
    const d = Math.abs(ly - rowY) / (lw * 0.45);
    return d < 1 ? (1 - d) * 1.4 * u * (i < 2 ? -1 : 1) : 0;
  };
  const card = (row: string[], i: number) => {
    const at = S3_CARDS[i];
    if (f < at - 8) return null;
    const p = ease(f, at - 8, at, Easing.out(Easing.cubic));
    const landed = f >= at;
    const pop = landed ? interpolate(f, [at, at + 3, at + 8], [1, 1.12, 1], clamp) : 1;
    const cells = [...row, "Yes", "Yes"];
    return (
      <div
        key={i}
        style={{
          position: "absolute",
          left,
          top: top0 + headH + i * (cardH + gap) + nudge(i),
          width: cardW,
          height: cardH,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          padding: `0 ${pad}px`,
          background: C.ivory,
          borderRadius: 1.4 * u,
          border: `1.5px solid ${C.hairline}40`,
          transform: `translateY(${(1 - p) * H * 0.7}px)`,
          zIndex: i < 2 ? 1 : 3,
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: fs,
          color: C.ink,
          whiteSpace: "nowrap",
        }}
      >
        {cells.map((cell, c) => (
          <div key={c} style={{ ...col(c), fontWeight: c === 0 ? 600 : 500, color: c >= 2 ? C.mutedLight : C.ink }}>
            {cell}
          </div>
        ))}
        <div style={col(4)}>
          <span
            style={{
              display: "inline-block",
              fontSize: fs * 0.82,
              fontWeight: 600,
              padding: `${fs * 0.2}px ${fs * 0.55}px`,
              borderRadius: 999,
              background: landed ? C.lime : `${C.hairline}1F`,
              color: landed ? C.ink : C.line,
              border: `1.5px solid ${landed ? C.ink : "transparent"}`,
              transform: `scale(${pop})`,
              transformOrigin: "left center",
            }}
          >
            Compliant
          </span>
        </div>
      </div>
    );
  };
  return (
    <Ground color={C.lime}>
      <div
        style={{
          position: "absolute",
          left: left + pad,
          top: top0,
          width: cardW - 2 * pad,
          height: headH,
          display: "flex",
          alignItems: "center",
          fontFamily: F.sans,
          fontWeight: 600,
          fontSize: fs * 0.62,
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          color: C.ink,
          opacity: ease(f, 0, 6),
        }}
      >
        {HEAD.map((h, c) => (
          <div key={h} style={col(c)}>
            {h}
          </div>
        ))}
      </div>
      {DEVICES.map(card)}
      {lp > 0 ? <Cutout art="laptop-open" x={lx} y={ly} w={lw} rot={lrot} z={2} /> : null}
    </Ground>
  );
};

// ---------- Scene 4 (14–19 s) · Deep Ink · DAY ONE: READY / LAST DAY: WIPED, a card flips ----------

const Scene4: React.FC<SceneProps> = ({ f }) => {
  const { W, H, u, wide } = useL();
  // Wide: one line each (LAST DAY: WIPED + dot ≈ 8.1 em). Tall: two lines each (LAST DAY: ≈ 4.7 em).
  const fs = wide ? (W * 0.7) / 8.1 : (W * 0.7) / 4.7;
  const [a, b, c, d, e, g] = S4_WORDS;
  const line = (words: [string, number][], dot: boolean) =>
    wide ? (
      <div>
        {words.map(([t, at], i) => (
          <Land key={t} f={f} at={at} gap={i > 0}>
            {t}
            {dot && i === words.length - 1 ? <Dot fontSize={fs} color={C.lime} /> : null}
          </Land>
        ))}
      </div>
    ) : (
      <>
        <div>
          {words.slice(0, 2).map(([t, at], i) => (
            <Land key={t} f={f} at={at} gap={i > 0}>
              {t}
            </Land>
          ))}
        </div>
        <div>
          <Land f={f} at={words[2][1]}>
            {words[2][0]}
            {dot ? <Dot fontSize={fs} color={C.lime} /> : null}
          </Land>
        </div>
      </>
    );
  const flip = ease(f, S4_FLIP - 2, S4_FLIP + 8, Easing.inOut(Easing.cubic));
  const angle = flip * 180;
  const cardIn = ease(f, c, c + 8);
  const cw = wide ? 74 * u : 86 * u;
  const cfs = (wide ? 3.6 : 3.9) * u;
  const face = (lead: string, restText: string, back: boolean) => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        gap: 1.8 * u,
        padding: `0 ${3.2 * u}px`,
        background: C.ivory,
        borderRadius: 1.6 * u,
        border: `1.5px solid ${C.hairline}40`,
        backfaceVisibility: "hidden",
        transform: back ? "rotateX(180deg)" : undefined,
        fontFamily: F.sans,
        fontSize: cfs,
        color: C.ink,
        whiteSpace: "nowrap",
      }}
    >
      <span style={{ width: cfs * 0.42, height: cfs * 0.42, borderRadius: "50%", background: back ? C.ink : C.lime, border: `1.5px solid ${C.ink}`, flexShrink: 0 }} />
      <span>
        <span style={{ fontWeight: 600 }}>{lead}</span>
        <span style={{ fontWeight: 500, color: C.mutedLight }}> · {restText}</span>
      </span>
    </div>
  );
  return (
    <Ground color={C.ink}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", gap: (wide ? 7 : 6) * u }}>
        <div style={{ ...kinetic(fs, C.lime), textAlign: "center" }}>
          {line(
            [
              ["DAY", a],
              ["ONE:", b],
              ["READY", c],
            ],
            true,
          )}
          <div style={{ height: fs * (wide ? 0.08 : 0.18) }} />
          {line(
            [
              ["LAST", d],
              ["DAY:", e],
              ["WIPED", g],
            ],
            true,
          )}
        </div>
        <div style={{ perspective: 1200, opacity: cardIn, transform: `translateY(${(1 - cardIn) * 6 * u}px)` }}>
          <div style={{ position: "relative", width: cw, height: cfs * 2.6, transformStyle: "preserve-3d", transform: `rotateX(${angle}deg)` }}>
            {face("New hire", "laptop shipped", false)}
            {face("Leaver", "device wiped and logged", true)}
          </div>
        </div>
      </AbsoluteFill>
    </Ground>
  );
};

// ---------- Scene 5 (19–25 s) · Deep Ink · "Series A, sorted" title card, product line ----------

const ITEMS = ["Dell", "HP", "Microsoft 365", "Copilot", "Intune", "Defender"];

const TitleCard: React.FC<{ f: number }> = ({ f }) => {
  const { W, H, u, wide } = useL();
  const fs = wide ? 17.5 * u : 12.5 * u;
  const title = ease(f, 4, 18);
  return (
    <>
      <Beam rise={ease(f, 0, 14, Easing.out(Easing.quad))} />
      <div
        style={{
          position: "absolute",
          left: 0,
          width: W,
          top: H * (wide ? 0.33 : 0.36),
          textAlign: "center",
          fontFamily: F.headline,
          fontWeight: 600,
          fontSize: fs,
          lineHeight: 0.95,
          letterSpacing: "-0.035em",
          color: C.ivory,
          opacity: title,
          transform: `translateY(${(1 - title) * 3 * u}px)`,
        }}
      >
        Series A,{" "}
        <span style={{ fontFamily: F.accent, fontStyle: "italic", fontWeight: 400, fontSize: fs * 1.12, letterSpacing: "-0.01em" }}>sorted</span>
        <Dot fontSize={fs} color={C.lime} />
      </div>
      <div
        style={{
          position: "absolute",
          left: wide ? 0 : 5 * u,
          width: wide ? W : W - 10 * u,
          top: H * (wide ? 0.33 : 0.36) + fs * (wide ? 1.45 : 1.5),
          textAlign: "center",
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: (wide ? 3.3 : 3.8) * u,
          lineHeight: 1.5,
          letterSpacing: "0.01em",
          color: C.mutedDark,
        }}
      >
        {ITEMS.map((it, i) => {
          const on = f >= S5_ITEMS[i];
          const p = ease(f, S5_ITEMS[i], S5_ITEMS[i] + 5);
          return (
            <span key={it} style={{ whiteSpace: "nowrap" }}>
              {i ? <span style={{ opacity: on ? 1 : 0 }}> · </span> : null}
              <span style={{ display: "inline-block", opacity: on ? 1 : 0, transform: `translateY(${(1 - p) * 1.2 * u}px)` }}>{it}</span>
            </span>
          );
        })}
      </div>
    </>
  );
};

const Scene5: React.FC<SceneProps> = ({ f }) => (
  <Ground color={C.ink}>
    <TitleCard f={f} />
  </Ground>
);

// ---------- Scene 6 (25–30 s) · Deep Ink · end card ----------

const Scene6: React.FC<SceneProps> = ({ f }) => {
  const { W, H, u, fps, side, wide } = useL();
  const logoW = (wide ? 30 : 46) * u;
  const inn = (at: number) => ({ opacity: ease(f, at, at + 8), transform: `translateY(${(1 - ease(f, at, at + 10)) * 2 * u}px)` });
  const pill = spring({ frame: f - 3 * B, fps, config: { damping: 12, stiffness: 220 } });
  const lfs = (wide ? 3.6 : 4.2) * u;
  return (
    <Ground color={C.ink}>
      <Beam rise={1} dim={0.3} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <Img src={staticFile(LOGO_FILE)} style={{ width: logoW, height: logoW / LOGO_RATIO, ...inn(0) }} />
        <div
          style={{
            marginTop: (wide ? 5 : 7) * u,
            textAlign: "center",
            fontFamily: F.sans,
            fontWeight: 500,
            fontSize: lfs,
            lineHeight: 1.35,
            color: C.ivory,
          }}
        >
          <div style={inn(B)}>One monthly price per employee.</div>
          <div style={inn(2 * B)}>One supplier, from quote to setup.</div>
        </div>
        <div
          style={{
            marginTop: (wide ? 4.5 : 6) * u,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: (wide ? 3.4 : 4) * u,
            lineHeight: 1,
            color: C.ink,
            background: C.lime,
            borderRadius: 999,
            padding: `${2 * u}px ${4.6 * u}px ${2.1 * u}px`,
            opacity: f >= 3 * B ? 1 : 0,
            transform: `scale(${0.6 + 0.4 * pill})`,
          }}
        >
          Book a Call
        </div>
        <div style={{ marginTop: 2.6 * u, fontFamily: F.sans, fontWeight: 400, fontSize: (wide ? 2.6 : 3.1) * u, color: C.ivory, opacity: 0.8 * ease(f, 4 * B, 4 * B + 8) }}>
          alertglobaltech.com
        </div>
      </AbsoluteFill>
      <LineArrow x={side} y={H - side - 3.5 * u} w={9 * u} color={C.ivory} p={ease(f, B, 2 * B, Easing.inOut(Easing.cubic))} />
    </Ground>
  );
};
