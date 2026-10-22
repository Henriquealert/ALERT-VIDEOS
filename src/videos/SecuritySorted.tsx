import { AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { WORDMARK_RATIO } from "../ui/Story";
import { C, Dot, F, tag } from "../ui/theme";

// "Security, sorted." — Windows 11 Pro laptops. ~22 s, 30 fps, 4:5 LinkedIn feed and 16:9.
// Editorial kinetic type with halftone collage: hard cuts on a 120 BPM grid (1 beat = 15 frames).
// Source: partner_content row 97022741-9b72-4593-ba1f-1da6089b2e14 ("built-in, chip-to-cloud security",
// "balanced innovation and protection"). Closing lines are the brand guide's platform and support lines.
// TPM 2.0, BitLocker, Secure Boot and Windows Hello are Windows 11 Pro features named in the brief, not
// in the row. The fleet table is illustrative (no client data). No numbers on screen.
// Halftone art: scripts/make-halftone-cutouts.py. Music and ticks: scripts/make-security-sorted-audio.py
// (TOKEN_LAND and TOKEN_CLICK below must match the frames in that script). Voiceover: ElevenLabs "Everett",
// placed by scripts/mix-security-sorted-voiceover.py; nothing is said over the monogram.
// Brand fonts only: Archivo ExtraBold is replaced by DM Sans Bold, DM Mono by the DM Sans `tag` style.

export const SECURITY_SORTED_4X5 = { fps: 30, durationInFrames: 660, width: 1080, height: 1350 } as const;
export const SECURITY_SORTED_16X9 = { ...SECURITY_SORTED_4X5, width: 1920, height: 1080 } as const;

// Shot starts: 0.0, 3.5, 7.0, 10.0, 13.5, 17.5, 19.0, end 22.0 (all on the beat).
const SHOTS = [0, 105, 210, 300, 405, 525, 570, 660];
const TOKEN_LAND = [81, 92, 102]; // shot 1, last token lands at 3.4 s
const TOKEN_CLICK = [339, 357, 375]; // shot 4, one each 0.6 s

// Music + voiceover, mixed by scripts/mix-security-sorted-voiceover.py (lines land at the shot starts).
const MIX = "audio/Alert Global Tech - Security Sorted Mix.wav";
const ART = (n: string) => staticFile(`art/security-sorted-${n}.png`);
const TOKENS = ["token-tpm", "token-bitlocker", "token-secureboot"];
const LAPTOP_RATIO = 1200 / 900;
// Where the tokens sit on the laptop deck (fractions of the laptop image), printed by the art script.
const LAPTOP_SPOTS = [
  { x: 0.325, y: 0.828 },
  { x: 0.422, y: 0.8 },
  { x: 0.761, y: 0.702 },
];
const SPOT_SIZE = 0.105; // token diameter on the deck, fraction of laptop width
// A circle lying flat on the deck plane (deck edges at -12 deg and 38 deg, foreshortened).
const DECK = [0.954, -0.207, 0.518, 0.4];
const MONOGRAM_RATIO = 410 / 450;

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = (f: number, a: number, b: number, easing = Easing.out(Easing.cubic)) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing });

const useL = () => {
  const { width: W, height: H, fps } = useVideoConfig();
  const u = Math.min(W, H) / 100;
  return { W, H, u, fps, wide: W > H, side: 7 * u };
};

// Falls with gravity to `to`, lands on `land`, then bounces and settles.
const drop = (f: number, land: number, from: number, to: number, bounce: number, fall = 9) => {
  if (f < land) {
    const t = Math.max(0, (f - (land - fall)) / fall);
    return from + (to - from) * t * t;
  }
  const dt = f - land;
  return to - bounce * Math.exp(-dt / 5) * Math.abs(Math.sin((dt * Math.PI) / 6));
};

export const SecuritySorted: React.FC = () => {
  const frame = useCurrentFrame();
  const shots = [Shot1, Shot2, Shot3, Shot4, Shot5, Shot6, Shot7];
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile(MIX)} />
      {shots.map((Shot, i) =>
        frame >= SHOTS[i] && frame < SHOTS[i + 1] ? <Shot key={i} f={frame - SHOTS[i]} /> : null,
      )}
      <Grain frame={frame} />
    </AbsoluteFill>
  );
};

type ShotProps = { f: number };

// ---------- Shared pieces ----------

// Light paper grain over every ground, re-seeded every other frame.
const Grain: React.FC<{ frame: number }> = ({ frame }) => {
  const { W, H } = useL();
  return (
    <svg width={W} height={H} style={{ position: "absolute", inset: 0, opacity: 0.16, mixBlendMode: "overlay" }}>
      <filter id="grain">
        <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves={2} seed={Math.floor(frame / 2)} />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width={W} height={H} filter="url(#grain)" />
    </svg>
  );
};

// Wordmark top-left: Ivory on ink, Ink on lime.
const Wordmark: React.FC<{ on: "ink" | "lime" }> = ({ on }) => {
  const { u, side } = useL();
  const w = 14 * u;
  return (
    <Img
      src={staticFile(on === "ink" ? "brand/alert-global-tech-wordmark-ivory.png" : "brand/alert-global-tech-wordmark-ink.png")}
      style={{ position: "absolute", left: side, top: 6 * u, width: w, height: w / WORDMARK_RATIO }}
    />
  );
};

const Ground: React.FC<{ color: string; children: React.ReactNode }> = ({ color, children }) => (
  <AbsoluteFill style={{ background: color, overflow: "hidden" }}>{children}</AbsoluteFill>
);

const headline = (size: number, color: string): React.CSSProperties => ({
  fontFamily: F.headline,
  fontWeight: 700,
  fontSize: size,
  lineHeight: 0.9,
  letterSpacing: "-0.025em",
  color,
});

// ---------- Shot 1 (0.0–3.5) · Deep Ink · SECURITY / SLOWS US / DOWN ----------

const WORDS = [
  [{ t: "SECURITY", at: 0 }],
  [
    { t: "SLOWS", at: 15 },
    { t: "US", at: 30 },
  ],
  [{ t: "DOWN", at: 45 }],
];
// Landing spot (fraction of the frame), size and spin of each token.
const RAIN = [
  { x: 0.72, y: 0.34, rot: -18, spin: 140 },
  { x: 0.27, y: 0.53, rot: 12, spin: -170 },
  { x: 0.63, y: 0.69, rot: -6, spin: 120 },
];

const Shot1: React.FC<ShotProps> = ({ f }) => {
  const { W, H, u, fps, wide } = useL();
  const fs = wide ? H * 0.25 : W * 0.205;
  const grow = interpolate(f, [0, 105], [0.86, 1.03], { ...clamp, easing: Easing.out(Easing.quad) });
  const size = (wide ? 24 : 27) * u;
  return (
    <Ground color={C.ink}>
      <Wordmark on="ink" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            transform: `scale(${grow})`,
            fontFamily: F.statement,
            fontWeight: 700,
            fontStyle: "italic",
            fontSize: fs,
            lineHeight: 0.86,
            color: C.lime,
            textAlign: "center",
          }}
        >
          {WORDS.map((line, li) => (
            <div key={li}>
              {line.map((w, wi) => {
                const p = spring({ frame: f - w.at, fps, config: { damping: 13, stiffness: 260 } });
                return (
                  <span
                    key={w.t}
                    style={{
                      display: "inline-block",
                      marginLeft: wi ? "0.22em" : 0,
                      opacity: f >= w.at ? 1 : 0,
                      transform: `scale(${0.4 + 0.6 * p})`,
                    }}
                  >
                    {w.t}
                    {li === WORDS.length - 1 ? <Dot fontSize={fs} color={C.lime} /> : null}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
      </AbsoluteFill>
      {/* Tokens rain in from 2.4 s, bounce and overlap the words */}
      {RAIN.map((r, i) => {
        const land = TOKEN_LAND[i];
        if (f < land - 9) return null;
        const y = drop(f, land, -size, r.y * H - size / 2, 4 * u);
        const settle = ease(f, land - 9, land + 8);
        return (
          <Img
            key={i}
            src={ART(TOKENS[i])}
            style={{
              position: "absolute",
              left: r.x * W - size / 2,
              top: y,
              width: size,
              height: size,
              transform: `rotate(${r.rot + r.spin * (1 - settle)}deg)`,
            }}
          />
        );
      })}
    </Ground>
  );
};

// ---------- Shot 2 (3.5–7.0) · Acid Lime · the claim types on ----------

const Shot2: React.FC<ShotProps> = ({ f }) => {
  const { u, side, wide, H } = useL();
  const fs = (wide ? 10 : 9.8) * u;
  const lines = wide
    ? [{ t: "Strong security and a fast team" }, { t: "don’t have to compete", hl: true }]
    : [{ t: "Strong security" }, { t: "and a fast team" }, { t: "don’t have to", hl: true }, { t: "compete", hl: true }];
  const typed = Math.max(0, (f - 3) * 1.5);
  let offset = 0;
  let hlIndex = 0;
  const allChars = lines.reduce((n, l) => n + l.t.length, 0);
  return (
    <Ground color={C.lime}>
      <Wordmark on="lime" />
      <div style={{ position: "absolute", left: side, top: H * (wide ? 0.34 : 0.3), ...headline(fs, C.ink) }}>
        {lines.map((l, i) => {
          const shown = Math.floor(Math.min(l.t.length, Math.max(0, typed - offset)));
          offset += l.t.length;
          const vis = l.t.slice(0, shown);
          const rest = l.t.slice(shown);
          const isLast = i === lines.length - 1;
          const dot = isLast && typed >= allChars ? <Dot fontSize={fs} color={C.ink} /> : null;
          if (!l.hl) {
            return (
              <div key={i}>
                {vis}
                <span style={{ color: "transparent" }}>{rest}</span>
              </div>
            );
          }
          // Deep Ink highlight block wipes in left to right behind the words; text turns lime.
          const k = hlIndex++;
          const wipe = ease(f, 46 + k * 8, 56 + k * 8, Easing.inOut(Easing.cubic));
          const pad = "0.1em";
          return (
            <div key={i} style={{ marginTop: k ? "0.08em" : "0.1em" }}>
              <span style={{ position: "relative", display: "inline-block" }}>
                <span>
                  {vis}
                  <span style={{ color: "transparent" }}>{rest}</span>
                </span>
                <span
                  style={{
                    position: "absolute",
                    top: "-0.06em",
                    bottom: "-0.08em",
                    left: `-${pad}`,
                    right: `-${pad}`,
                    padding: `0.06em ${pad} 0`,
                    background: C.ink,
                    color: C.lime,
                    whiteSpace: "nowrap",
                    clipPath: `inset(0 ${(1 - wipe) * 100}% 0 0)`,
                  }}
                >
                  {vis}
                </span>
              </span>
              {dot ? <span style={{ marginLeft: "0.1em" }}>{dot}</span> : null}
            </div>
          );
        })}
      </div>
    </Ground>
  );
};

// ---------- Shot 3 (7.0–10.0) · Acid Lime · fleet table cards ----------

const HEAD = ["Device", "Team", "OS", "Encryption", "Sign-in"];
const FLEET = ["Finance", "Sales", "Operations", "Front desk"].map((team, i) => [
  `Laptop 0${i + 1}`,
  team,
  "Windows 11 Pro",
  "BitLocker on",
  "Windows Hello",
]);
const COLS = [1, 1.1, 1.35, 1.3, 1.3];

const Shot3: React.FC<ShotProps> = ({ f }) => {
  const { W, H, u, side, wide } = useL();
  const cardW = Math.min(W - 2 * side, 150 * u);
  const fs = (wide ? 3 : 2.25) * u;
  const cardH = fs * 2.9;
  const gap = fs * 0.6;
  const rows = [HEAD, ...FLEET];
  const stackH = rows.length * cardH + (rows.length - 1) * gap;
  const top0 = (H - stackH) / 2 + 3 * u;
  // The list keeps rising, then leaves through the top as the shot ends.
  const drift = -6 * u * (f / 90) - interpolate(f, [58, 90], [0, top0 + stackH], { ...clamp, easing: Easing.in(Easing.cubic) });
  const total = COLS.reduce((a, b) => a + b, 0);
  return (
    <Ground color={C.lime}>
      <Wordmark on="lime" />
      <div style={{ position: "absolute", left: (W - cardW) / 2, top: top0, width: cardW, transform: `translateY(${drift}px)` }}>
        {rows.map((row, i) => {
          const at = 2 + Math.round(i * 7.5);
          const p = ease(f, at, at + 10);
          if (f < at) return null;
          const head = i === 0;
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                top: i * (cardH + gap),
                width: cardW,
                height: cardH,
                boxSizing: "border-box",
                display: "flex",
                alignItems: "center",
                padding: `0 ${fs * 0.9}px`,
                background: C.ivory,
                borderRadius: 12,
                border: `1.5px solid ${C.mutedLight}`,
                transform: `translateY(${(1 - p) * H * 0.55}px)`,
              }}
            >
              {row.map((cell, c) => (
                <div
                  key={c}
                  style={{
                    width: `${(COLS[c] / total) * 100}%`,
                    fontFamily: F.sans,
                    fontWeight: 500,
                    fontSize: head ? fs * 0.82 : fs,
                    letterSpacing: head ? "0.1em" : "0",
                    textTransform: head ? "uppercase" : "none",
                    color: head ? C.mutedLight : C.ink,
                    whiteSpace: "nowrap",
                  }}
                >
                  {!head && c === 3 ? (
                    <span
                      style={{
                        display: "inline-block",
                        background: C.blue,
                        color: C.ivory,
                        borderRadius: 999,
                        fontSize: fs * 0.86,
                        padding: `${fs * 0.22}px ${fs * 0.6}px`,
                      }}
                    >
                      {cell}
                    </span>
                  ) : (
                    cell
                  )}
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Ground>
  );
};

// ---------- Shot 4 (10.0–13.5) · Acid Lime · the laptop and its tokens ----------

const Shot4: React.FC<ShotProps> = ({ f }) => {
  const { W, H, u, wide } = useL();
  const lw = wide ? H * 0.64 * LAPTOP_RATIO : W * 0.8;
  const lh = lw / LAPTOP_RATIO;
  const cx = W / 2;
  const cy = H * (wide ? 0.54 : 0.55);
  const lx = cx - lw / 2;
  const ly = drop(f, 10, -lh - H * 0.2, cy - lh / 2, 7 * u, 10);
  const push = interpolate(f, [0, 105], [1, 1.1], { ...clamp, easing: Easing.inOut(Easing.quad) });
  const orbitSize = 15 * u;
  const deckSize = lw * SPOT_SIZE;
  return (
    <Ground color={C.lime}>
      <Wordmark on="lime" />
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: `${cx}px ${cy}px` }}>
        <Img src={ART("laptop")} style={{ position: "absolute", left: lx, top: ly, width: lw, height: lh }} />
        {TOKENS.map((t, i) => {
          const click = TOKEN_CLICK[i] - SHOTS[3];
          const enter = ease(f, 6 + i * 3, 18 + i * 3);
          if (enter <= 0) return null;
          // Orbit: an ellipse round the laptop, tilted like the deck.
          const a = (i * 2 * Math.PI) / 3 + f * 0.075 - Math.PI / 2;
          const rx = lw * (0.62 + 0.5 * (1 - enter));
          const ry = lh * (0.5 + 0.5 * (1 - enter));
          const ox = cx + rx * Math.cos(a);
          const oy = cy + ry * Math.sin(a) * 0.9 - 2 * u;
          // Click into place: fly to the deck spot over the 8 frames before the click.
          const p = ease(f, click - 8, click, Easing.inOut(Easing.cubic));
          const sx = lx + LAPTOP_SPOTS[i].x * lw;
          const sy = cy - lh / 2 + LAPTOP_SPOTS[i].y * lh;
          const x = ox + (sx - ox) * p;
          const y = oy + (sy - oy) * p;
          const s = orbitSize + (deckSize - orbitSize) * p;
          const m = [1, 0, 0, 1].map((v, k) => v + (DECK[k] - v) * p);
          const snap = f >= click ? interpolate(f, [click, click + 2, click + 6], [1, 1.12, 1], clamp) : 1;
          return (
            <Img
              key={t}
              src={ART(t)}
              style={{
                position: "absolute",
                left: x - s / 2,
                top: y - s / 2,
                width: s,
                height: s,
                opacity: enter,
                transform: `matrix(${m.join(",")}) scale(${snap})`,
              }}
            />
          );
        })}
      </AbsoluteFill>
    </Ground>
  );
};

// ---------- Shot 5 (13.5–17.5) · Deep Ink · Insights panel, stepped blocks ----------

const STEPS = [
  { label: "Chip", fill: C.lime },
  { label: "Device", fill: C.blue },
  { label: "Identity", fill: `linear-gradient(0deg, ${C.blue} 0%, ${C.sky} 60%, ${C.skyLight} 100%)` },
  { label: "Cloud", fill: "transparent", outline: true },
];

const Shot5: React.FC<ShotProps> = ({ f }) => {
  const { W, H, u, wide } = useL();
  const pw = wide ? W * 0.56 : W * 0.86;
  const ph = wide ? H * 0.78 : H * 0.62;
  const px = (W - pw) / 2;
  const py = (H - ph) / 2 + 2 * u;
  const pad = 4.5 * u;
  const headH = 17 * u; // label, title, tabs
  const labelH = 5 * u;
  const chart = { x: px + pad, y: py + pad + headH, w: pw - 2 * pad, h: ph - 2 * pad - headH - labelH };
  const rise = ease(f, 0, 10);
  // Camera pushes into the steps until they fill the frame.
  const push = ease(f, 56, 118, Easing.inOut(Easing.cubic));
  const ccx = chart.x + chart.w / 2;
  const ccy = chart.y + chart.h / 2;
  const scale = 1 + (Math.max(W / chart.w, H / chart.h) * 1.04 - 1) * push;
  const gap = 2.2 * u;
  const bw = (chart.w - 3 * gap) / 4;
  return (
    <Ground color={C.ink}>
      <Wordmark on="ink" />
      <AbsoluteFill
        style={{
          transformOrigin: `${ccx}px ${ccy}px`,
          transform: `translate(${(W / 2 - ccx) * push}px, ${(H / 2 - ccy) * push}px) scale(${scale})`,
        }}
      >
        <div
          style={{
            position: "absolute",
            left: px,
            top: py,
            width: pw,
            height: ph,
            boxSizing: "border-box",
            padding: pad,
            background: C.ivory,
            borderRadius: 16,
            border: `1.5px solid ${C.mutedLight}`,
            transform: `translateY(${(1 - rise) * H * 0.7}px)`,
          }}
        >
          <div style={{ fontFamily: F.sans, fontWeight: 500, fontSize: 2.3 * u, color: C.mutedLight }}>Insights</div>
          <div style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 4.6 * u, color: C.ink, marginTop: 0.6 * u, letterSpacing: "-0.01em" }}>
            Device security
          </div>
          <div style={{ display: "flex", gap: 3.2 * u, marginTop: 2.6 * u, borderBottom: `1.5px solid ${C.mutedLight}` }}>
            {["Overview", "Devices", "Policies"].map((t, i) => (
              <div
                key={t}
                style={{
                  fontFamily: F.sans,
                  fontWeight: 500,
                  fontSize: 2.2 * u,
                  color: i === 0 ? C.ink : C.mutedLight,
                  paddingBottom: 1.2 * u,
                  borderBottom: i === 0 ? `${0.45 * u}px solid ${C.blue}` : "none",
                  marginBottom: -1.5,
                }}
              >
                {t}
              </div>
            ))}
          </div>
        </div>
        {/* Four stepped blocks rise left to right; labels underneath */}
        {STEPS.map((s, i) => {
          const at = 14 + Math.round(i * 7.5);
          const p = ease(f, at, at + 9, Easing.out(Easing.back(1.4)));
          const h = (chart.h * (i + 1)) / 4;
          const x = chart.x + i * (bw + gap);
          const panelY = (1 - rise) * H * 0.7;
          return (
            <div key={s.label}>
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: chart.y + chart.h - h + panelY,
                  width: bw,
                  height: h,
                  boxSizing: "border-box",
                  background: s.fill,
                  border: s.outline ? `${0.4 * u}px solid ${C.ink}` : "none",
                  transform: `scaleY(${Math.max(0, p)})`,
                  transformOrigin: "bottom",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: x,
                  top: chart.y + chart.h + 1.6 * u + panelY,
                  ...tag(1.9 * u, C.mutedLight),
                  opacity: ease(f, at + 4, at + 10),
                }}
              >
                {s.label}
              </div>
            </div>
          );
        })}
      </AbsoluteFill>
    </Ground>
  );
};

// ---------- Shot 6 (17.5–19.0) · Deep Ink · the a! monogram on a lime square ----------

const Shot6: React.FC<ShotProps> = ({ f }) => {
  const { u, fps } = useL();
  const p = spring({ frame: f, fps, config: { damping: 9, stiffness: 180, mass: 0.8 } });
  const size = 36 * u;
  const mh = size * 0.4;
  return (
    <Ground color={C.ink}>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div
          style={{
            width: size,
            height: size,
            borderRadius: size * 0.16,
            background: C.lime,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${p})`,
          }}
        >
          <Img src={ART("monogram-ink")} style={{ height: mh, width: mh * MONOGRAM_RATIO }} />
        </div>
      </AbsoluteFill>
    </Ground>
  );
};

// ---------- Shot 7 (19.0–22.0) · Deep Ink · end card ----------

const Shot7: React.FC<ShotProps> = ({ f }) => {
  const { W, H, u, fps, side, wide } = useL();
  const logoW = (wide ? 24 : 30) * u;
  const block = (wide ? 50 : 40) * u;
  const hs = (wide ? 13 : 9.6) * u;
  const textW = wide ? 72 * u : W - 2 * side - block - 5 * u;
  const rowW = block + 6 * u + textW;
  const left = wide ? (W - rowW) / 2 : side;
  const top = wide ? H * 0.25 : H * 0.24;
  const inn = (at: number) => ({ opacity: ease(f, at, at + 6), transform: `translateY(${(1 - ease(f, at, at + 8)) * 3 * u}px)` });
  const pill = spring({ frame: f - 16, fps, config: { damping: 12, stiffness: 220 } });
  const laptopW = block * 0.9;
  const ly = drop(f, 10, -block, block / 2 - laptopW / LAPTOP_RATIO / 2, 2.5 * u, 8);

  const copy = (
    <>
      <div style={{ ...headline(hs, C.ivory), ...inn(6) }}>
        Security,
        <br />
        sorted
        <Dot fontSize={hs} color={C.lime} />
      </div>
      <div
        style={{
          fontFamily: F.sans,
          fontWeight: 400,
          fontSize: (wide ? 2.8 : 3.1) * u,
          lineHeight: 1.35,
          color: C.ivory,
          marginTop: 3 * u,
          maxWidth: wide ? textW : W - 2 * side,
          ...inn(12),
        }}
      >
        Windows 11 Pro laptops from Dell, HP and Lenovo. One supplier, from quote to setup.
      </div>
    </>
  );
  const action = (
    <>
      <div
        style={{
          alignSelf: "flex-start",
          marginTop: 4 * u,
          fontFamily: F.sans,
          fontWeight: 700,
          fontSize: 3.4 * u,
          color: C.ink,
          background: C.lime,
          borderRadius: 999,
          padding: `${1.9 * u}px ${4.4 * u}px`,
          opacity: f >= 16 ? 1 : 0,
          transform: `scale(${0.6 + 0.4 * pill})`,
          transformOrigin: "left center",
        }}
      >
        Request a Quote
      </div>
      <div style={{ ...tag(2.3 * u, C.mutedLight), marginTop: 3.6 * u, ...inn(22) }}>sales@alertglobaltech.com · EN · ES · PT</div>
    </>
  );
  return (
    <Ground color={C.ink}>
      <Img
        src={staticFile(LOGO_FILE)}
        style={{ position: "absolute", left: (W - logoW) / 2, top: 6 * u, width: logoW, height: logoW / LOGO_RATIO, ...inn(0) }}
      />
      <div style={{ position: "absolute", left, top, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: wide ? 6 * u : 5 * u }}>
          <div
            style={{
              position: "relative",
              width: block,
              height: block,
              background: C.ivory,
              overflow: "hidden",
              transform: `translateX(${(1 - ease(f, 0, 8)) * -12 * u}px)`,
              opacity: ease(f, 0, 5),
            }}
          >
            <Img
              src={ART("laptop")}
              style={{ position: "absolute", left: (block - laptopW) / 2, top: ly, width: laptopW, height: laptopW / LAPTOP_RATIO }}
            />
          </div>
          {wide ? (
            <div style={{ width: textW, display: "flex", flexDirection: "column" }}>
              {copy}
              {action}
            </div>
          ) : (
            <div style={{ width: textW }}>
              <div style={{ ...headline(hs, C.ivory), ...inn(6) }}>
                Security,
                <br />
                sorted
                <Dot fontSize={hs} color={C.lime} />
              </div>
            </div>
          )}
        </div>
        {wide ? null : (
          <div style={{ display: "flex", flexDirection: "column", marginTop: 2 * u }}>
            <div
              style={{
                fontFamily: F.sans,
                fontWeight: 400,
                fontSize: 3.3 * u,
                lineHeight: 1.35,
                color: C.ivory,
                marginTop: 3 * u,
                maxWidth: W - 2 * side,
                ...inn(12),
              }}
            >
              Windows 11 Pro laptops from Dell, HP and Lenovo. One supplier, from quote to setup.
            </div>
            {action}
          </div>
        )}
      </div>
    </Ground>
  );
};
