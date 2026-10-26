import { AbsoluteFill, Audio, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { LOGO_RATIO } from "../ui/EndCard";
import { C, F } from "../ui/theme";

// "Spreadsheets, sorted." — Bauhaus, flat, graphic brand story. 20 s, 30 fps, no voiceover.
// 9x16 (Stories) and a LinkedIn feed cut at 4x5: same timing and copy, positions from STORY / FEED below.
// Fixed copy from Henrique's brief (26 Oct 2026). Five scenes: v7 hook -> too many spreadsheets ->
// one system (Dynamics 365 Business Central) -> one supplier -> end card.
// Flat colour only, the core four. Text only moves or cuts; shapes slide, drop or scale uniformly.
// Grid: 120 BPM, 1 beat = 15 frames. Shapes, tabs and dots LAND on their cue (the move runs the
// MOVE frames before it), so the "tok" in the track sits on the landing.
// Track: scripts/make-spreadsheets-sorted-audio.py; its TOKS list matches the landing cues below.

export const SPREADSHEETS_SORTED = { fps: 30, durationInFrames: 600, width: 1080, height: 1920 } as const;
export const SPREADSHEETS_SORTED_4X5 = { fps: 30, durationInFrames: 600, width: 1080, height: 1350 } as const;

const W = 1080;
const SIDE = 80;
const MOVE = 7; // about 0.25 s
const MUSIC = "audio/Alert Global Tech - Spreadsheets Sorted Music.wav";
const LOGO_IVORY = "brand/alert-global-tech-lockup-ivory.png";
const LOGO_INK = "brand/alert-global-tech-lockup-ink.png";

// Vertical positions per format. The lockup never moves: top-left, in the 9x16 just inside the 250 px safe zone.
const STORY = {
  H: 1920,
  logo: { y: 262, w: 260 },
  hook: { y: 500, h: 600 },
  v7: { x: 250, y: 1140, size: 900 },
  tabs: { y: 470, dy: 140 },
  tooMany: 1250,
  grid: { y: 540, cell: 320, gap: 80 },
  system: 1370,
  caption: 1520,
  one: 430,
  supplier: 590,
  block: { y: 820, h: 440 },
  disc: { cx: 850, cy: 1270, r: 200, fill: 8.4 },
  end: 540,
  button: { y: 880, d: 420 },
  cover: { head: 480, unit: 880, cell: 320 },
};
type Layout = typeof STORY;
const FEED: Layout = {
  H: 1350,
  logo: { y: 64, w: 220 },
  hook: { y: 230, h: 560 },
  v7: { x: 250, y: 640, size: 800 },
  tabs: { y: 270, dy: 116 },
  tooMany: 900,
  grid: { y: 330, cell: 240, gap: 60 },
  system: 1000,
  caption: 1140,
  one: 220,
  supplier: 380,
  block: { y: 600, h: 400 },
  disc: { cx: 850, cy: 1000, r: 180, fill: 7.6 },
  end: 260,
  button: { y: 620, d: 380 },
  cover: { head: 280, unit: 640, cell: 300 },
};
const useL = (): Layout => (useVideoConfig().height > 1500 ? STORY : FEED);

// Cue in seconds -> frame.
const s = (sec: number) => Math.round(sec * 30);

// Transitions (start, end).
const T1 = [s(3.3), s(3.5)]; // ink panel down
const T2 = [s(7.5), s(8.0)]; // FINAL_v7 tab grows
const T3 = [s(12.5), s(13.0)]; // lime wipe up
const T4 = [s(16.5), s(17.0)]; // ink disc grows

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const easeOut = Easing.out(Easing.cubic);
const prog = (f: number, a: number, b: number) => interpolate(f, [a, b], [0, 1], { ...clamp, easing: easeOut });
// 0 -> 1, landing on frame `at`.
const land = (f: number, at: number, len = MOVE) => prog(f, at - len, at);
const on = (f: number, at: number) => f >= at;

export const SpreadsheetsSorted: React.FC = () => {
  const f = useCurrentFrame();
  const L = useL();
  const H = L.H;
  return (
    <AbsoluteFill style={{ background: C.blue, overflow: "hidden" }}>
      <Audio src={staticFile(MUSIC)} />
      {f < T1[1] ? <Scene1 f={f} L={L} /> : null}
      {f >= T1[0] && f < T2[1] ? (
        <Clip path={`inset(0px 0px ${H * (1 - prog(f, T1[0], T1[1]))}px 0px)`}>
          <Scene2 f={f} L={L} />
        </Clip>
      ) : null}
      {f >= T2[1] && f < T3[1] ? <Scene3 f={f} L={L} /> : null}
      {f >= T3[0] && f < T4[1] ? (
        <Clip path={`inset(${H * (1 - prog(f, T3[0], T3[1]))}px 0px 0px 0px)`}>
          <Scene4 f={f} L={L} />
        </Clip>
      ) : null}
      {f >= T4[1] ? <Scene5 f={f} L={L} /> : null}
      <Logo f={f} L={L} />
    </AbsoluteFill>
  );
};

const Clip: React.FC<{ path: string; children: React.ReactNode }> = ({ path, children }) => (
  <AbsoluteFill style={{ clipPath: path, overflow: "hidden" }}>{children}</AbsoluteFill>
);

// ---------- Shared pieces ----------

// The light ground under the logo at frame f, as an SVG path in frame coordinates (null: all dark).
const lightRegion = (f: number, L: Layout): string | null => {
  const rect = (x: number, y: number, w: number, h: number) => `M${x} ${y} H${x + w} V${y + h} H${x} Z`;
  const circle = (cx: number, cy: number, r: number) =>
    `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  if (f < T2[0] || f >= T4[1]) return null;
  if (f < T2[1]) {
    // Body and lip of the growing tab; it scales about the centre of its box (lip included).
    const k = tabScale(f);
    const t = tabsFor(L)[4];
    const cx = t.x + TAB.w / 2;
    const half = (TAB.h + TAB.lip) / 2;
    const cy = t.y - TAB.lip + half;
    const top = cy - half * k;
    return rect(cx - (TAB.w / 2) * k, top + TAB.lip * k, TAB.w * k, TAB.h * k) + rect(cx - (TAB.w / 2) * k, top, TAB.lipW * k, TAB.lip * k);
  }
  if (f < T4[0]) return rect(0, 0, W, L.H);
  return rect(0, 0, W, L.H) + circle(L.disc.cx, L.disc.cy, L.disc.r * discScale(f, L));
};

// Ivory lockup on dark grounds, Ink on light; split along the wipe edge during a transition.
const LogoImg: React.FC<{ file: string; L: Layout }> = ({ file, L }) => (
  <Img src={staticFile(file)} style={{ position: "absolute", left: SIDE, top: L.logo.y, width: L.logo.w, height: L.logo.w / LOGO_RATIO }} />
);

const Logo: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  const light = lightRegion(f, L);
  const full = `M0 0 H${W} V${L.H} H0 Z`;
  const img = (file: string) => <LogoImg file={file} L={L} />;
  return (
    <>
      <AbsoluteFill style={light ? { clipPath: `path(evenodd, "${full} ${light}")` } : undefined}>{img(LOGO_IVORY)}</AbsoluteFill>
      {light ? <AbsoluteFill style={{ clipPath: `path(evenodd, "${light}")` }}>{img(LOGO_INK)}</AbsoluteFill> : null}
    </>
  );
};

const Text: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  weight?: 400 | 700;
  dx?: number;
  dy?: number;
  width?: number;
  lh?: number;
  children: React.ReactNode;
}> = ({ x, y, size, color, weight = 700, dx = 0, dy = 0, width, lh = 1.0, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width,
      fontFamily: F.sans,
      fontWeight: weight,
      fontSize: size,
      lineHeight: lh,
      letterSpacing: weight === 700 ? "-0.03em" : "0em",
      color,
      whiteSpace: width ? "normal" : "nowrap",
      transform: `translate(${dx}px, ${dy}px)`,
    }}
  >
    {children}
  </div>
);

// The round dot that replaces a full stop: drops from above and lands on its cue.
const DropDot: React.FC<{ f: number; at: number; size: number; color: string }> = ({ f, at, size, color }) => {
  if (f < at - MOVE) return null;
  const d = size * 0.17;
  const y = (1 - land(f, at)) * -size * 1.6;
  return (
    <span
      style={{
        display: "inline-block",
        width: d,
        height: d,
        borderRadius: "50%",
        background: color,
        marginLeft: d * 0.3,
        verticalAlign: "baseline",
        transform: `translateY(${y}px)`,
      }}
    />
  );
};

// ---------- Scene 1: hook, Electric Blue (0:00-3:30) ----------

const Scene1: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  const HOOK = { x: 0, w: 980, at: s(0.5), ...L.hook };
  const v7 = (1 - prog(f, 0, s(0.4))) * 1000;
  const wipe = land(f, HOOK.at);
  return (
    <AbsoluteFill style={{ background: C.blue }}>
      <Text x={L.v7.x} y={L.v7.y} size={L.v7.size} color={C.lime} dy={v7}>
        v7
      </Text>
      <div
        style={{
          position: "absolute",
          left: HOOK.x,
          top: HOOK.y,
          width: HOOK.w,
          height: HOOK.h,
          background: C.ivory,
          clipPath: `inset(0px ${HOOK.w * (1 - wipe)}px 0px 0px)`,
        }}
      />
      {on(f, s(1.0)) ? <Text x={SIDE} y={HOOK.y + 70} size={104} color={C.ink}>Which forecast</Text> : null}
      {on(f, s(1.5)) ? <Text x={SIDE} y={HOOK.y + 70 + 112} size={104} color={C.ink}>is the real</Text> : null}
      {on(f, s(2.0)) ? <Text x={SIDE} y={HOOK.y + 70 + 224} size={104} color={C.ink}>one?</Text> : null}
      {on(f, s(2.5)) ? (
        <Text x={SIDE} y={HOOK.y + HOOK.h - 110} size={40} weight={400} color={C.ink}>
          — Every month-end
        </Text>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- Scene 2: too many spreadsheets, Deep Ink (3:50-7:50) ----------

const TAB = { w: 520, h: 116, lip: 28, lipW: 180 };
const tabsFor = (L: Layout) => [
  { label: "Invoices.xlsx", bg: C.lime, fg: C.ink, at: s(4.0) },
  { label: "Sales.xlsx", bg: C.ivory, fg: C.ink, at: s(4.5) },
  { label: "Stock.xlsx", bg: C.blue, fg: C.ivory, at: s(5.0) },
  { label: "Payroll.xlsx", bg: C.lime, fg: C.ink, at: s(5.5) },
  { label: "FINAL_v7.xlsx", bg: C.ivory, fg: C.ink, at: s(6.0) },
].map((t, i) => ({ ...t, x: SIDE + i * 100, y: L.tabs.y + i * L.tabs.dy }));

// FINAL_v7 grows from its centre until it covers the frame (T2).
const tabScale = (f: number) => interpolate(prog(f, T2[0], T2[1]), [0, 1], [1, 26]);

// Drop from above the frame, then the film's only bounce: a 2-frame settle after landing.
const tabY = (f: number, at: number, y: number) => {
  if (f <= at) return interpolate(land(f, at), [0, 1], [-(y + 300), 10]);
  return interpolate(f, [at, at + 2], [10, 0], clamp);
};

const Tab: React.FC<{ t: ReturnType<typeof tabsFor>[number]; dy: number; scale?: number; label?: boolean }> = ({ t, dy, scale = 1, label = true }) => (
  <div
    style={{
      position: "absolute",
      left: t.x,
      top: t.y - TAB.lip,
      width: TAB.w,
      height: TAB.h + TAB.lip,
      transform: `translateY(${dy}px) scale(${scale})`,
    }}
  >
    <div style={{ position: "absolute", left: 0, top: 0, width: TAB.lipW, height: TAB.lip + 1, background: t.bg }} />
    <div style={{ position: "absolute", left: 0, top: TAB.lip, width: TAB.w, height: TAB.h, background: t.bg }} />
    {label ? (
      <Text x={36} y={TAB.lip + 34} size={46} color={t.fg}>
        {t.label}
      </Text>
    ) : null}
  </div>
);

const Scene2: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  const head = { y: L.tooMany, size: 120 };
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {tabsFor(L).map((t, i) =>
        f >= t.at - MOVE ? (
          <Tab
            key={t.label}
            t={t}
            dy={tabY(f, t.at, t.y)}
            scale={i === 4 ? tabScale(f) : 1}
            label={!(i === 4 && f >= T2[0])}
          />
        ) : null,
      )}
      {f >= s(6.5) - MOVE && f < T2[0] ? (
        <Text x={SIDE} y={head.y} size={head.size} color={C.ivory} dx={(land(f, s(6.5)) - 1) * W}>
          Too many
        </Text>
      ) : null}
      {f >= s(7.0) - MOVE && f < T2[0] ? (
        <Text x={SIDE} y={head.y + 128} size={head.size} color={C.lime} dx={(land(f, s(7.0)) - 1) * W}>
          spreadsheets
          <DropDot f={f} at={s(7.2)} size={head.size} color={C.lime} />
        </Text>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- Scene 3: one system, Soft Ivory (8:00-12:50) ----------

const PARTS = [
  { shape: "square", color: C.blue, name: "Finance", sub: "Ledger, invoices", at: s(8.5) },
  { shape: "circle", color: C.lime, name: "Sales", sub: "Quotes, orders", at: s(9.0) },
  { shape: "triangle", color: C.ink, name: "Service", sub: "Cases", at: s(9.5) },
  { shape: "half", color: C.blue, name: "Operations", sub: "Stock, purchasing", at: s(10.0) },
] as const;

const Shape: React.FC<{ shape: (typeof PARTS)[number]["shape"]; color: string; size: number }> = ({ shape, color, size: CELL }) => (
  <svg width={CELL} height={CELL} viewBox={`0 0 ${CELL} ${CELL}`} style={{ display: "block" }}>
    {shape === "square" ? <rect width={CELL} height={CELL} fill={color} /> : null}
    {shape === "circle" ? <circle cx={CELL / 2} cy={CELL / 2} r={CELL / 2} fill={color} /> : null}
    {shape === "triangle" ? <polygon points={`0,${CELL} ${CELL / 2},0 ${CELL},${CELL}`} fill={color} /> : null}
    {/* Flat side up, so it closes against the circle above it. */}
    {shape === "half" ? <path d={`M0 0 H${CELL} A${CELL / 2} ${CELL / 2} 0 0 1 0 0 Z`} fill={color} /> : null}
  </svg>
);

const Scene3: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  const { cell: CELL, gap: GAP } = L.grid;
  const GRID = { x: SIDE, y: L.grid.y };
  const H = L.H;
  // 10:50 the gaps close, then open back: four parts, one unit.
  const close = land(f, s(10.7), 6) - land(f, s(10.95), 6);
  const shift = (close * GAP) / 2;
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      {PARTS.map((p, i) => {
        if (f < p.at - MOVE) return null;
        const col = i % 2;
        const row = Math.floor(i / 2);
        const x = GRID.x + col * (CELL + GAP) + (col ? -shift : shift);
        const y = GRID.y + row * (CELL + GAP) + (row ? -shift : shift);
        const ly = row ? GRID.y + 2 * CELL + GAP + 22 : GRID.y - 100;
        return (
          <div key={p.name}>
            <div style={{ position: "absolute", left: x, top: y, transform: `scale(${land(f, p.at)})` }}>
              <Shape shape={p.shape} color={p.color} size={CELL} />
            </div>
            {on(f, p.at) ? (
              <>
                <Text x={GRID.x + col * (CELL + GAP)} y={ly} size={40} color={C.ink}>
                  {p.name}
                </Text>
                <Text x={GRID.x + col * (CELL + GAP)} y={ly + 46} size={30} weight={400} color={C.ink}>
                  {p.sub}
                </Text>
              </>
            ) : null}
          </div>
        );
      })}
      {f >= s(11.0) - MOVE ? (
        <Text x={SIDE} y={L.system} size={120} color={C.ink} dy={(1 - land(f, s(11.0))) * (H - L.system)}>
          One system
          <DropDot f={f} at={s(11.2)} size={120} color={C.blue} />
        </Text>
      ) : null}
      {on(f, s(11.5)) ? (
        <Text x={SIDE} y={L.caption} size={34} weight={400} color={C.ink} width={W - 2 * SIDE} lh={1.3}>
          Dynamics 365 Business Central connects finance, sales, service and operations in one app, with Copilot built in.
        </Text>
      ) : null}
    </AbsoluteFill>
  );
};

// ---------- Scene 4: one supplier, Acid Lime (13:00-16:50) ----------

// The ink disc grows from its centre until it covers the frame (T4).
const discScale = (f: number, L: Layout) => interpolate(prog(f, T4[0], T4[1]), [0, 1], [1, L.disc.fill]);

const Scene4: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  const BLOCK = { x: 0, w: 860, notch: 130, ...L.block };
  const DISC = L.disc;
  const discIn = land(f, s(15.5));
  const k = discScale(f, L);
  const hold = f < T4[0];
  return (
    <AbsoluteFill style={{ background: C.lime }}>
      {f >= s(13.0) ? (
        <Text x={SIDE} y={L.one} size={170} color={C.ink} dy={(prog(f, s(13.0), s(13.0) + MOVE) - 1) * (L.one + 270)}>
          ONE
        </Text>
      ) : null}
      {f >= s(13.5) - MOVE ? (
        <Text x={SIDE} y={L.supplier} size={170} color={C.ink} dy={(land(f, s(13.5)) - 1) * (L.supplier + 270)}>
          SUPPLIER
        </Text>
      ) : null}
      {f >= s(14.0) - MOVE ? (
        <div
          style={{
            position: "absolute",
            left: BLOCK.x,
            top: BLOCK.y,
            width: BLOCK.w,
            height: BLOCK.h,
            background: C.blue,
            transform: `translateX(${(land(f, s(14.0)) - 1) * BLOCK.w}px)`,
          }}
        />
      ) : null}
      {f >= s(14.2) - 3 ? (
        <div
          style={{
            position: "absolute",
            left: BLOCK.x + BLOCK.w - BLOCK.notch,
            top: BLOCK.y,
            width: BLOCK.notch,
            height: BLOCK.notch,
            background: C.lime,
            transform: `scale(${land(f, s(14.2), 3)})`,
          }}
        />
      ) : null}
      {on(f, s(14.5)) ? <Text x={SIDE} y={BLOCK.y + 70} size={96} color={C.ivory}>From quote</Text> : null}
      {on(f, s(14.75)) ? (
        <Text x={SIDE} y={BLOCK.y + 70 + 104} size={96} color={C.ivory}>
          to setup
          <DropDot f={f} at={s(15.0)} size={96} color={C.lime} />
        </Text>
      ) : null}
      {on(f, s(15.0)) ? (
        <Text x={SIDE} y={BLOCK.y + BLOCK.h - 104} size={40} weight={400} color={C.ivory}>
          Licences, setup and rollout.
        </Text>
      ) : null}
      {f >= s(15.5) - MOVE ? (
        <div
          style={{
            position: "absolute",
            left: DISC.cx - DISC.r,
            top: DISC.cy - DISC.r,
            width: 2 * DISC.r,
            height: 2 * DISC.r,
            borderRadius: "50%",
            background: C.ink,
            transform: `translateX(${(1 - discIn) * (W - DISC.cx + DISC.r)}px) scale(${k})`,
          }}
        />
      ) : null}
      {hold && on(f, s(16.0)) ? <Text x={DISC.cx - 118} y={DISC.cy - 24} size={48} color={C.ivory}>EN</Text> : null}
      {hold && on(f, s(16.2)) ? <Text x={DISC.cx - 30} y={DISC.cy - 24} size={48} color={C.lime}>ES</Text> : null}
      {hold && on(f, s(16.4)) ? <Text x={DISC.cx + 58} y={DISC.cy - 24} size={48} color={C.ivory}>PT</Text> : null}
    </AbsoluteFill>
  );
};

// ---------- Scene 5: end card, Deep Ink (17:00-20:00) ----------

const Scene5: React.FC<{ f: number; L: Layout }> = ({ f, L }) => {
  const BUTTON = { x: SIDE, ...L.button };
  return (
  <AbsoluteFill style={{ background: C.ink }}>
    <Text x={SIDE} y={L.end} size={132} color={C.ivory}>
      Spreadsheets,
    </Text>
    {f >= s(17.5) - MOVE ? (
      <Text x={SIDE} y={L.end + 140} size={132} color={C.lime} dx={(land(f, s(17.5)) - 1) * W}>
        sorted
        <DropDot f={f} at={s(17.7)} size={132} color={C.lime} />
      </Text>
    ) : null}
    {f >= s(18.0) - MOVE ? (
      <div
        style={{
          position: "absolute",
          left: BUTTON.x,
          top: BUTTON.y,
          width: BUTTON.d,
          height: BUTTON.d,
          borderRadius: "50%",
          background: C.lime,
          transform: `scale(${land(f, s(18.0))})`,
        }}
      />
    ) : null}
    {on(f, s(18.0)) ? (
      <Text x={BUTTON.x + 74} y={BUTTON.y + BUTTON.d / 2 - 62} size={60} color={C.ink} lh={1.05}>
        Request
        <br />a Quote
      </Text>
    ) : null}
    {on(f, s(18.2)) ? (
      <Text x={SIDE} y={BUTTON.y + BUTTON.d + 70} size={44} weight={400} color={C.ivory}>
        alertglobal.tech
      </Text>
    ) : null}
  </AbsoluteFill>
  );
};

// ---------- Cover / thumbnail (still) ----------
// The end-card headline over the four parts closed into one unit (scene 3's "one system").
// The triangle is Ivory here, since Ink would vanish on the Ink ground.

export const SPREADSHEETS_SORTED_COVER = { fps: 30, durationInFrames: 1, width: 1080, height: 1920 } as const;
export const SPREADSHEETS_SORTED_COVER_4X5 = { fps: 30, durationInFrames: 1, width: 1080, height: 1350 } as const;

export const SpreadsheetsSortedCover: React.FC = () => {
  const L = useL();
  const CELL = L.cover.cell;
  const unit = { x: SIDE, y: L.cover.unit };
  const colors = [C.blue, C.lime, C.ivory, C.blue];
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <Text x={SIDE} y={L.cover.head} size={132} color={C.ivory}>
        Spreadsheets,
      </Text>
      <Text x={SIDE} y={L.cover.head + 140} size={132} color={C.lime}>
        sorted
        <DropDot f={1} at={0} size={132} color={C.lime} />
      </Text>
      {PARTS.map((p, i) => (
        <div key={p.name} style={{ position: "absolute", left: unit.x + (i % 2) * CELL, top: unit.y + Math.floor(i / 2) * CELL }}>
          <Shape shape={p.shape} color={colors[i]} size={CELL} />
        </div>
      ))}
      <LogoImg file={LOGO_IVORY} L={L} />
    </AbsoluteFill>
  );
};
