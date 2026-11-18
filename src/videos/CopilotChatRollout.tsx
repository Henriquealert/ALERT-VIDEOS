import { AbsoluteFill, Audio, Easing, Img, interpolate, random, spring, staticFile, useCurrentFrame } from "remotion";
import { LOGO_RATIO } from "../ui/EndCard";
import { WORDMARK_RATIO } from "../ui/Story";
import { C, F } from "../ui/theme";

// "Copilot Chat rollout, sorted." LinkedIn feed video. 20 s, 1080x1350, 30 fps, no voiceover.
// Fixed copy from Henrique's brief (18 Nov 2026). Seven scenes, crisp cuts:
//   1   0-75   Ink: chat box types the question, send click at 70
//   2  75-135  Ink: reply bubble grows into an Ivory card (the Microsoft claim, sourced)
//   3 135-225  Ink + lime block: 01 Make it available, three pins drop
//   4 225-315  Blue: 02 Make it known, envelope opens, APPROVED stamps in
//   5 315-405  Ink: 03 Make it safe, five bubbles drift, lime arrow sweeps them into one lane
//   6 405-495  Ivory: 04 Make it impactful, prompt chips stack into three stepped blocks
//   7 495-600  Ink: everything collapses to centre, headline, lockup, CTA, URL; hold from 540
// Flat colour only, the core four (no gradients, no derived tones). DM Sans stands in for the
// brief's Helvetica: only the brand fonts may be used (scripts/check-fonts.mjs). Regular width, never scaled.
// Cuts land on a 120 BPM grid (1 beat = 15 frames); the track is
// scripts/make-copilot-chat-rollout-audio.py, its CLICKS list matches CUTS below.

export const COPILOT_CHAT_ROLLOUT = { fps: 30, durationInFrames: 600, width: 1080, height: 1350 } as const;
// 4 s loop of the held end card, for the thumbnail.
export const COPILOT_CHAT_ROLLOUT_THUMB = { fps: 30, durationInFrames: 120, width: 1080, height: 1350 } as const;

const W = 1080;
const H = 1350;
const SIDE = 72;
const INNER = W - 2 * SIDE;
const MUSIC = "audio/Alert Global Tech - Copilot Chat Rollout Music.wav";
const LOCKUP = "brand/alert-global-tech-lockup-ivory.png";
const WORDMARK_IVORY = "brand/alert-global-tech-wordmark-ivory.png";
const WORDMARK_INK = "brand/alert-global-tech-wordmark-ink.png";

export const CUTS = [0, 75, 135, 225, 315, 405, 495] as const;
const SEND_CLICK = 70;
const HOLD = 540;
const STAGGER = 7;

const QUESTION = "Which AI is your team using right now?";
const CLAIM = "Microsoft 365 Copilot Chat comes with eligible Microsoft 365 business plans";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
// Spring entrance, 0 -> 1 from frame `at` (damping 14).
const sp = (f: number, at: number, stiffness = 120) =>
  f < at ? 0 : spring({ frame: f - at, fps: 30, config: { damping: 14, stiffness, mass: 1 } });
const ease = (f: number, a: number, b: number) =>
  interpolate(f, [a, b], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });

// ---------- Type ----------

const Text: React.FC<{
  x: number;
  y: number;
  size: number;
  color: string;
  weight?: number;
  w?: number;
  lh?: number;
  align?: "left" | "center" | "right";
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ x, y, size, color, weight = 700, w = INNER, lh = 1.04, align = "left", style, children }) => (
  <div
    style={{
      position: "absolute",
      left: x,
      top: y,
      width: w,
      fontFamily: F.sans,
      fontWeight: weight,
      fontSize: size,
      lineHeight: lh,
      letterSpacing: weight >= 700 ? "-0.015em" : "0",
      color,
      textAlign: align,
      ...style,
    }}
  >
    {children}
  </div>
);

// Round dot in place of the full stop (about 19% of cap height, sits on the baseline).
const RoundDot: React.FC<{ size: number; color: string; scale?: number }> = ({ size, color, scale = 1 }) => {
  const d = size * 0.17;
  return (
    <span
      style={{
        display: "inline-block",
        width: d,
        height: d,
        borderRadius: "50%",
        background: color,
        marginLeft: d * 0.3,
        transform: `scale(${scale})`,
      }}
    />
  );
};

// Entrance: rise and settle on a spring. Text never scales.
const rise = (k: number, dist = 40): React.CSSProperties => ({
  opacity: Math.min(1, k * 1.6),
  transform: `translateY(${(1 - k) * dist}px)`,
});

// ---------- Chrome: wordmark, header rail, crosshairs ----------

type Ground = "ink" | "blue" | "ivory";
const fg = (g: Ground) => (g === "ivory" ? C.ink : C.ivory);

const Wordmark: React.FC<{ g: Ground }> = ({ g }) => (
  <Img
    src={staticFile(g === "ivory" ? WORDMARK_INK : WORDMARK_IVORY)}
    style={{ position: "absolute", left: SIDE, top: 52, width: 150, height: 150 / WORDMARK_RATIO }}
  />
);

const RAIL_Y = 136;
const Rail: React.FC<{ g: Ground; step: number }> = ({ g, step }) => {
  const c = fg(g);
  const label: React.CSSProperties = {
    fontFamily: F.sans,
    fontWeight: 600,
    fontSize: 17,
    letterSpacing: "0.24em",
    textTransform: "uppercase",
    color: c,
    whiteSpace: "nowrap",
  };
  return (
    <>
      <div style={{ position: "absolute", left: SIDE, top: RAIL_Y, width: INNER, display: "flex", alignItems: "center" }}>
        <span style={label}>Alert Global Tech</span>
        <span style={{ width: 72, height: 1.5, background: c, margin: "0 18px 0 14px" }} />
        <span style={label}>Copilot Chat</span>
        <span style={{ flex: 1 }} />
        <span style={label}>{String(step).padStart(2, "0")}/04</span>
      </div>
      <div style={{ position: "absolute", left: SIDE, top: RAIL_Y + 40, width: INNER, height: 1, background: c, opacity: 0.35 }} />
    </>
  );
};

const Crosshair: React.FC<{ x: number; y: number; color: string; size?: number; style?: React.CSSProperties }> = ({
  x,
  y,
  color,
  size = 34,
  style,
}) => (
  <svg width={size} height={size} viewBox="0 0 34 34" style={{ position: "absolute", left: x - size / 2, top: y - size / 2, ...style }}>
    <path d="M17 0 V34 M0 17 H34" stroke={color} strokeWidth={1.5} />
    <circle cx={17} cy={17} r={7} fill="none" stroke={color} strokeWidth={1.5} />
  </svg>
);

const CROSS = [
  { x: SIDE, y: H - 70 },
  { x: W - SIDE, y: H - 70 },
];
const Chrome: React.FC<{ g: Ground; step: number; wordmark?: boolean }> = ({ g, step, wordmark = true }) => (
  <>
    {wordmark ? <Wordmark g={g} /> : null}
    <Rail g={g} step={step} />
    {CROSS.map((c, i) => (
      <Crosshair key={i} x={c.x} y={c.y} color={fg(g)} />
    ))}
  </>
);

// Step headline: "01 /" over the line, both from the brief.
const STEP_Y = 250;
const StepHead: React.FC<{ f: number; at: number; n: string; title: string; color: string; dot: string; x?: number; y?: number }> = ({
  f,
  at,
  n,
  title,
  color,
  dot,
  x = SIDE,
  y = STEP_Y,
}) => (
  <>
    <Text x={x} y={y} size={40} color={color} weight={700} style={rise(sp(f, at))}>
      {n} /
    </Text>
    <Text x={x} y={y + 58} size={96} color={color} style={rise(sp(f, at + STAGGER))}>
      {title}
      <RoundDot size={96} color={dot} scale={sp(f, at + 2 * STAGGER, 220)} />
    </Text>
  </>
);

// ---------- Scene 1: the question (0-75) ----------

const BOX = { x: SIDE, y: 590, w: INNER, h: 150 };
const TYPE_AT = 16;

const Scene1: React.FC<{ f: number }> = ({ f }) => {
  const k = sp(f, 2);
  const chars = Math.max(0, Math.min(QUESTION.length, Math.floor((f - TYPE_AT) * 2)));
  const typing = f >= TYPE_AT && chars < QUESTION.length;
  const cursorOn = typing || Math.floor(f / 8) % 2 === 0;
  const press = f >= SEND_CLICK ? 1 - 0.14 * Math.sin(Math.min(1, (f - SEND_CLICK) / 5) * Math.PI) : 1;
  const ring = f >= SEND_CLICK ? (f - SEND_CLICK) / 5 : -1;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div
        style={{
          position: "absolute",
          left: BOX.x,
          top: BOX.y,
          width: BOX.w,
          height: BOX.h,
          border: `2px solid ${C.ivory}`,
          borderRadius: 28,
          transform: `translateY(${(1 - k) * 60}px)`,
          opacity: Math.min(1, k * 1.6),
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 40,
            top: 0,
            height: BOX.h,
            width: BOX.w - 190,
            display: "flex",
            alignItems: "center",
            fontFamily: F.sans,
            fontWeight: 500,
            fontSize: 40,
            color: C.ivory,
            whiteSpace: "nowrap",
          }}
        >
          {QUESTION.slice(0, chars)}
          <span style={{ width: 4, height: 50, marginLeft: 4, background: C.lime, opacity: cursorOn ? 1 : 0 }} />
        </div>
        <div
          style={{
            position: "absolute",
            right: 24,
            top: (BOX.h - 100) / 2,
            width: 100,
            height: 100,
            borderRadius: "50%",
            background: C.lime,
            transform: `scale(${press})`,
          }}
        >
          <svg width={100} height={100} viewBox="0 0 100 100">
            <path d="M50 70 V32 M34 47 L50 31 L66 47" stroke={C.ink} strokeWidth={8} fill="none" strokeLinecap="square" />
          </svg>
        </div>
        {ring >= 0 && ring < 1 ? (
          <div
            style={{
              position: "absolute",
              right: 24 + 50 - 50 * (1 + ring * 0.9),
              top: BOX.h / 2 - 50 * (1 + ring * 0.9),
              width: 100 * (1 + ring * 0.9),
              height: 100 * (1 + ring * 0.9),
              borderRadius: "50%",
              border: `3px solid ${C.lime}`,
              opacity: 1 - ring,
            }}
          />
        ) : null}
      </div>
      <Chrome g="ink" step={0} />
    </AbsoluteFill>
  );
};

// ---------- Scene 2: the reply card (75-135) ----------

const CARD_H = 520;
const Scene2: React.FC<{ f: number }> = ({ f }) => {
  const sent = sp(f, 75);
  const grow = Math.min(1, sp(f, 88, 110));
  const card = {
    x: SIDE,
    y: 420,
    w: interpolate(grow, [0, 1], [180, INNER]),
    h: interpolate(grow, [0, 1], [90, CARD_H]),
  };
  const dotsOn = f < 90;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* Sent question, right-aligned outline bubble */}
      <div
        style={{
          position: "absolute",
          right: SIDE,
          top: 250,
          maxWidth: 760,
          padding: "22px 30px",
          border: `2px solid ${C.ivory}`,
          borderRadius: "28px 28px 6px 28px",
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: 32,
          color: C.ivory,
          ...rise(sent, 120),
        }}
      >
        {QUESTION}
      </div>
      {/* Reply bubble grows into the card */}
      {f >= 80 ? (
        <div
          style={{
            position: "absolute",
            left: card.x,
            top: card.y,
            width: card.w,
            height: card.h,
            background: C.ivory,
            borderRadius: interpolate(grow, [0, 1], [45, 28], clamp) + "px",
            borderTopLeftRadius: 6,
            transform: `scale(${Math.min(1, sp(f, 80, 220))})`,
            transformOrigin: "0 0",
            overflow: "hidden",
          }}
        >
          {dotsOn ? (
            <div style={{ position: "absolute", left: 40, top: 33, display: "flex", gap: 14 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: C.ink,
                    opacity: Math.floor(f / 3) % 3 === i ? 1 : 0.3,
                  }}
                />
              ))}
            </div>
          ) : null}
          <div style={{ position: "absolute", left: 56, top: 50, display: "flex", alignItems: "center", gap: 14, ...rise(sp(f, 96), 30) }}>
            <span style={{ width: 16, height: 16, background: C.blue }} />
            <span style={{ fontFamily: F.sans, fontWeight: 600, fontSize: 18, letterSpacing: "0.24em", color: C.ink }}>
              COPILOT CHAT
            </span>
          </div>
          <Text x={56} y={110} w={INNER - 112} size={68} lh={1.06} color={C.ink} style={rise(sp(f, 100), 40)}>
            {CLAIM}
            <RoundDot size={68} color={C.blue} scale={sp(f, 108, 220)} />
          </Text>
          <div style={{ position: "absolute", left: 56, right: 56, bottom: 92, height: 1.5, background: C.ink, opacity: rise(sp(f, 112)).opacity }} />
          <Text x={56} y={CARD_H - 74} w={INNER - 112} size={22} weight={500} color={C.ink} style={rise(sp(f, 112), 20)}>
            Source: Microsoft
          </Text>
        </div>
      ) : null}
      <Chrome g="ink" step={0} />
    </AbsoluteFill>
  );
};

// ---------- Scene 3: 01 Make it available (135-225) ----------

const PIN_TARGETS = ["Windows taskbar", "Teams", "Outlook"];
const PIN_ROW_Y = 1010;

const Pin: React.FC<{ color: string; hole: string }> = ({ color, hole }) => (
  <svg width={84} height={112} viewBox="0 0 84 112">
    <path d="M42 110 C42 110 4 62 4 42 A38 38 0 0 1 80 42 C80 62 42 110 42 110 Z" fill={color} />
    <circle cx={42} cy={42} r={14} fill={hole} />
  </svg>
);

const Scene3: React.FC<{ f: number }> = ({ f }) => {
  const block = sp(f, 135, 140);
  const colW = (INNER - 2 * 24) / 3;
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 214,
          width: W - SIDE,
          height: 300,
          background: C.lime,
          transform: `translateX(${(block - 1) * W}px)`,
        }}
      />
      <StepHead f={f} at={141} n="01" title="Make it available" color={C.ink} dot={C.blue} />
      <Text x={SIDE} y={570} size={44} weight={400} lh={1.2} w={820} color={C.ivory} style={rise(sp(f, 156))}>
        Pin it to the Windows taskbar, Teams and Outlook.
      </Text>
      {/* Hairline rail the targets sit on */}
      <div style={{ position: "absolute", left: SIDE, top: PIN_ROW_Y + 96, width: INNER * ease(f, 160, 175), height: 1.5, background: C.ivory }} />
      {PIN_TARGETS.map((t, i) => {
        const x = SIDE + i * (colW + 24);
        const chip = sp(f, 166 + i * STAGGER);
        const drop = sp(f, 182 + i * STAGGER, 180);
        return (
          <div key={t}>
            <div
              style={{
                position: "absolute",
                left: x,
                top: PIN_ROW_Y,
                width: colW,
                height: 76,
                border: `2px solid ${C.ivory}`,
                borderRadius: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: F.sans,
                fontWeight: 600,
                fontSize: 28,
                color: C.ivory,
                ...rise(chip, 30),
              }}
            >
              {t}
            </div>
            {f >= 182 + i * STAGGER ? (
              <div
                style={{
                  position: "absolute",
                  left: x + colW / 2 - 42,
                  top: PIN_ROW_Y - 128 - (1 - drop) * 520,
                }}
              >
                <Pin color={C.lime} hole={C.ink} />
              </div>
            ) : null}
          </div>
        );
      })}
      <Chrome g="ink" step={1} />
    </AbsoluteFill>
  );
};

// ---------- Scene 4: 02 Make it known (225-315) ----------

const ENV = { x: 330, y: 930, w: 420, h: 280 };

const Scene4: React.FC<{ f: number }> = ({ f }) => {
  const env = sp(f, 246);
  const open = ease(f, 262, 272); // flap 0 closed -> 1 open
  const letter = sp(f, 270, 110);
  const stamp = f >= 288 ? spring({ frame: f - 288, fps: 30, config: { damping: 14, stiffness: 260 } }) : 0;
  const flapK = Math.cos(open * Math.PI); // 1 -> -1, flips up about the top edge
  const flap = (
    <svg
      width={ENV.w}
      height={ENV.h * 0.58}
      viewBox={`0 0 ${ENV.w} ${ENV.h * 0.58}`}
      style={{ position: "absolute", left: 0, top: 0, transform: `scaleY(${flapK})`, transformOrigin: "50% 0" }}
    >
      <path d={`M1 1 H${ENV.w - 1} L${ENV.w / 2} ${ENV.h * 0.58 - 2} Z`} fill={C.ivory} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
    </svg>
  );
  const lift = interpolate(letter, [0, 1], [0, 230]);
  return (
    <AbsoluteFill style={{ background: C.blue }}>
      <StepHead f={f} at={229} n="02" title="Make it known" color={C.ivory} dot={C.lime} />
      <Text x={SIDE} y={454} size={44} weight={400} lh={1.2} w={820} color={C.ivory} style={rise(sp(f, 244))}>
        Announce it as your company-approved AI.
      </Text>
      <div
        style={{
          position: "absolute",
          left: ENV.x,
          top: ENV.y,
          width: ENV.w,
          height: ENV.h,
          transform: `translateY(${(1 - env) * 500}px)`,
        }}
      >
        {/* back */}
        <div style={{ position: "absolute", inset: 0, background: C.ivory }} />
        {open > 0.5 ? flap : null}
        {/* letter */}
        <div
          style={{
            position: "absolute",
            left: 28,
            top: 22 - lift,
            width: ENV.w - 56,
            height: ENV.h - 40,
            background: C.ink,
            padding: "30px 30px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontFamily: F.sans, fontWeight: 700, fontSize: 30, color: C.ivory }}>Copilot Chat</div>
          {[0.86, 0.7, 0.78].map((w, i) => (
            <div key={i} style={{ marginTop: i === 0 ? 22 : 14, height: 8, width: `${w * 100}%`, background: C.ivory, opacity: 0.5 }} />
          ))}
        </div>
        {/* front pocket */}
        <svg width={ENV.w} height={ENV.h} viewBox={`0 0 ${ENV.w} ${ENV.h}`} style={{ position: "absolute", left: 0, top: 0 }}>
          <path
            d={`M0 ${ENV.h * 0.3} L${ENV.w / 2} ${ENV.h * 0.66} L${ENV.w} ${ENV.h * 0.3} V${ENV.h} H0 Z`}
            fill={C.ivory}
            stroke={C.ink}
            strokeWidth={2.5}
            strokeLinejoin="round"
          />
        </svg>
        {open <= 0.5 ? flap : null}
        {/* APPROVED tag stamps onto the letter */}
        {f >= 288 ? (
          <div
            style={{
              position: "absolute",
              left: ENV.w / 2 - 40,
              top: -lift + 130,
              padding: "14px 26px",
              background: C.lime,
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: 38,
              letterSpacing: "0.12em",
              color: C.ink,
              transform: `rotate(-7deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`,
              opacity: Math.min(1, stamp * 3),
            }}
          >
            APPROVED
          </div>
        ) : null}
      </div>
      <Chrome g="blue" step={2} />
    </AbsoluteFill>
  );
};

// ---------- Scene 5: 03 Make it safe (315-405) ----------

const LANE = { y: 1140, h: 110, x0: SIDE, x1: W - SIDE };
const SWEEP = [356, 380] as const;
const ARROW_X = (f: number) => interpolate(f, [SWEEP[0], SWEEP[1]], [-260, 760], { ...clamp, easing: Easing.out(Easing.cubic) });
const BUBBLES = Array.from({ length: 5 }, (_, i) => ({
  x: 110 + i * 170 + random(`ccr-bx-${i}`) * 60,
  y: 800 + random(`ccr-by-${i}`) * 170,
  ph: random(`ccr-ph-${i}`) * Math.PI * 2,
}));
const SLOT_X = (i: number) => SIDE + 12 + i * 118;
const BUB = { w: 110, h: 72 };

const ChatBubble: React.FC<{ color: string }> = ({ color }) => (
  <svg width={BUB.w} height={BUB.h + 18} viewBox={`0 0 ${BUB.w} ${BUB.h + 18}`}>
    <path
      d={`M14 2 H${BUB.w - 14} Q${BUB.w - 2} 2 ${BUB.w - 2} 14 V${BUB.h - 12} Q${BUB.w - 2} ${BUB.h} ${BUB.w - 14} ${BUB.h} H40 L22 ${BUB.h + 16} L24 ${BUB.h} H14 Q2 ${BUB.h} 2 ${BUB.h - 12} V14 Q2 2 14 2 Z`}
      fill="none"
      stroke={color}
      strokeWidth={3}
      strokeLinejoin="round"
    />
    {[0, 1, 2].map((d) => (
      <circle key={d} cx={BUB.w / 2 - 20 + d * 20} cy={BUB.h / 2 + 1} r={5} fill={color} />
    ))}
  </svg>
);

// Chunky up-right arrow, the one arrow in the film.
const BigArrow: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox="0 0 100 100">
    <path d="M20 8 H92 V80 H72 V42 L22 92 L8 78 L58 28 H20 Z" fill={color} />
  </svg>
);

const Scene5: React.FC<{ f: number }> = ({ f }) => {
  const ax = ARROW_X(f);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <StepHead f={f} at={319} n="03" title="Make it safe" color={C.ivory} dot={C.lime} />
      <Text x={SIDE} y={454} size={44} weight={400} lh={1.2} w={900} color={C.ivory} style={rise(sp(f, 334))}>
        Redirect other AI tools to m365copilot.com with DNS, firewall or proxy rules.
      </Text>
      {/* Lane: two hairline rails and the destination */}
      {[LANE.y, LANE.y + LANE.h].map((y) => (
        <div key={y} style={{ position: "absolute", left: LANE.x0, top: y, width: (LANE.x1 - LANE.x0) * ease(f, 336, 352), height: 1.5, background: C.ivory }} />
      ))}
      <div
        style={{
          position: "absolute",
          right: SIDE,
          top: LANE.y + LANE.h / 2 - 34,
          height: 68,
          padding: "0 26px",
          borderRadius: 34,
          background: C.lime,
          display: "flex",
          alignItems: "center",
          fontFamily: F.sans,
          fontWeight: 700,
          fontSize: 28,
          color: C.ink,
          ...rise(sp(f, 348), 20),
        }}
      >
        m365copilot.com
      </div>
      {BUBBLES.map((b, i) => {
        const appear = sp(f, 338 + i * STAGGER);
        const dx = Math.sin(f / 14 + b.ph) * 22;
        const dy = Math.cos(f / 17 + b.ph) * 16;
        // Swept when the arrow passes the bubble.
        let hit = SWEEP[1] + 1;
        for (let t = SWEEP[0]; t <= SWEEP[1]; t++) if (ARROW_X(t) + 120 >= b.x) { hit = t; break; }
        const k = sp(f, hit, 150);
        const x = interpolate(k, [0, 1], [b.x + dx, SLOT_X(i)]);
        const y = interpolate(k, [0, 1], [b.y + dy, LANE.y + (LANE.h - BUB.h - 18) / 2 + 4]);
        return (
          <div key={i} style={{ position: "absolute", left: x, top: y, opacity: Math.min(1, appear * 1.6), transform: `scale(${0.6 + 0.4 * appear})` }}>
            <ChatBubble color={C.ivory} />
          </div>
        );
      })}
      {f >= SWEEP[0] ? (
        <div style={{ position: "absolute", left: ax, top: 820 + ease(f, SWEEP[0], SWEEP[1]) * 0 }}>
          <BigArrow size={180} color={C.lime} />
        </div>
      ) : null}
      <Chrome g="ink" step={3} />
    </AbsoluteFill>
  );
};

// ---------- Scene 6: 04 Make it impactful (405-495) ----------

// Illustrative starter prompts. Columns of 1, 2 and 3 chips: lime, blue, outline.
const CHIPS: { col: number; row: number; text: string }[] = [
  { col: 0, row: 0, text: "Summarise this thread" },
  { col: 1, row: 0, text: "Draft a reply" },
  { col: 1, row: 1, text: "Recap the meeting" },
  { col: 2, row: 0, text: "Plan my week" },
  { col: 2, row: 1, text: "Explain this file" },
  { col: 2, row: 2, text: "Polish this email" },
];
const STEP = { bottom: 1230, w: (INNER - 2 * 12) / 3, h: 110, gap: 12 };

const Scene6: React.FC<{ f: number }> = ({ f }) => {
  const merge = ease(f, 476, 486); // gaps close, chips become solid steps
  const gap = STEP.gap * (1 - merge);
  return (
    <AbsoluteFill style={{ background: C.ivory }}>
      <StepHead f={f} at={409} n="04" title="Make it impactful" color={C.ink} dot={C.blue} />
      <Text x={SIDE} y={454} size={44} weight={400} lh={1.2} w={820} color={C.ink} style={rise(sp(f, 424))}>
        Share starter prompts. Run short training.
      </Text>
      <div style={{ position: "absolute", left: SIDE, top: STEP.bottom + 2, width: INNER * ease(f, 426, 440), height: 1.5, background: C.ink }} />
      {CHIPS.map((c, i) => {
        const at = 434 + i * STAGGER;
        if (f < at) return null;
        const k = sp(f, at, 200);
        const x = SIDE + c.col * (STEP.w + 12);
        const y = STEP.bottom - (c.row + 1) * STEP.h - c.row * gap;
        const fill = c.col === 0 ? C.lime : c.col === 1 ? C.blue : "transparent";
        const color = c.col === 1 ? C.ivory : C.ink;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y - (1 - Math.min(k, 1)) * 260,
              opacity: Math.min(1, k * 2),
              width: STEP.w,
              height: STEP.h,
              boxSizing: "border-box",
              background: fill,
              border: c.col === 2 ? `2.5px solid ${C.ink}` : "none",
              borderRadius: (STEP.h / 2) * (1 - merge),
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: 26,
              color,
              whiteSpace: "nowrap",
            }}
          >
            {c.text}
          </div>
        );
      })}
      <Chrome g="ivory" step={4} />
    </AbsoluteFill>
  );
};

// ---------- Scene 7: close (495-600) ----------

const CENTRE = { x: W / 2, y: 640 };
// Pieces from the steps fly in from the edges and collapse into the centre.
const DEBRIS = [
  { x: 120, y: 260, s: 120, kind: "lime" },
  { x: 900, y: 300, s: 150, kind: "blue" },
  { x: 140, y: 1120, s: 140, kind: "outline" },
  { x: 880, y: 1100, s: 170, kind: "arrow" },
  { x: 540, y: 1240, s: 34, kind: "cross" },
  { x: 540, y: 240, s: 34, kind: "cross" },
] as const;

const Close: React.FC<{ f: number; loop?: number }> = ({ f, loop }) => {
  const head = sp(f, 514);
  const lock = sp(f, 524);
  const pill = sp(f, 532, 160);
  const url = sp(f, 540);
  // Thumbnail loop: the dot breathes once every 4 s, the pill arrow nudges once. Both return to rest at the seam.
  const breathe = loop === undefined ? 1 : 1 + 0.18 * Math.sin((loop / 120) * Math.PI * 2) ** 2;
  const nudge = loop === undefined ? 0 : 8 * Math.sin((loop / 120) * Math.PI * 2);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {DEBRIS.map((d, i) => {
        const k = ease(f, 495 + i * 2, 513 + i * 2);
        if (k >= 1) return null;
        const x = interpolate(k, [0, 1], [d.x, CENTRE.x]);
        const y = interpolate(k, [0, 1], [d.y, CENTRE.y]);
        const s = d.s * (1 - k);
        const style: React.CSSProperties = { position: "absolute", left: x - s / 2, top: y - s / 2, width: s, height: s, boxSizing: "border-box" };
        if (d.kind === "lime") return <div key={i} style={{ ...style, background: C.lime }} />;
        if (d.kind === "blue") return <div key={i} style={{ ...style, background: C.blue }} />;
        if (d.kind === "outline") return <div key={i} style={{ ...style, border: `2.5px solid ${C.ivory}` }} />;
        if (d.kind === "arrow")
          return (
            <div key={i} style={{ position: "absolute", left: x - s / 2, top: y - s / 2 }}>
              <BigArrow size={Math.max(1, s)} color={C.lime} />
            </div>
          );
        return <Crosshair key={i} x={x} y={y} size={Math.max(1, s)} color={C.ivory} />;
      })}
      <Text x={SIDE} y={350} size={100} lh={1.02} align="center" color={C.ivory} style={rise(head, 50)}>
        Copilot Chat
        <br />
        rollout, sorted
        <RoundDot size={100} color={C.lime} scale={sp(f, 520, 220) * breathe} />
      </Text>
      <Img
        src={staticFile(LOCKUP)}
        style={{
          position: "absolute",
          left: W / 2 - 170,
          top: 640,
          width: 340,
          height: 340 / LOGO_RATIO,
          opacity: Math.min(1, lock * 1.6),
          transform: `translateY(${(1 - lock) * 30}px)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: W / 2 - 230,
          top: 900,
          width: 460,
          height: 100,
          borderRadius: 50,
          background: C.lime,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          fontFamily: F.sans,
          fontWeight: 700,
          fontSize: 38,
          color: C.ink,
          transform: `scale(${pill})`,
        }}
      >
        Talk to an Expert
        <svg width={30} height={30} viewBox="0 0 30 30" style={{ transform: `translateX(${nudge}px)` }}>
          <path d="M3 15 H25 M15 5 L25 15 L15 25" stroke={C.ink} strokeWidth={4} fill="none" />
        </svg>
      </div>
      <Text x={SIDE} y={1046} size={32} weight={500} align="center" color={C.ivory} style={rise(url, 20)}>
        alertglobal.tech
      </Text>
      <Rail g="ink" step={4} />
      {CROSS.map((c, i) => (
        <Crosshair key={i} x={c.x} y={c.y} color={C.ivory} style={{ opacity: Math.min(1, url * 1.6) }} />
      ))}
    </AbsoluteFill>
  );
};

// ---------- Composition ----------

export const CopilotChatRollout: React.FC = () => {
  const f = useCurrentFrame();
  const scene = CUTS.filter((c) => f >= c).length; // 1..7
  return (
    <AbsoluteFill style={{ background: C.ink, overflow: "hidden" }}>
      <Audio src={staticFile(MUSIC)} />
      {scene === 1 ? <Scene1 f={f} /> : null}
      {scene === 2 ? <Scene2 f={f} /> : null}
      {scene === 3 ? <Scene3 f={f} /> : null}
      {scene === 4 ? <Scene4 f={f} /> : null}
      {scene === 5 ? <Scene5 f={f} /> : null}
      {scene === 6 ? <Scene6 f={f} /> : null}
      {scene === 7 ? <Close f={f} /> : null}
    </AbsoluteFill>
  );
};

// Thumbnail: the held end card as a 4 s seamless loop (no audio).
export const CopilotChatRolloutThumb: React.FC = () => {
  const f = useCurrentFrame();
  return <Close f={HOLD + 60} loop={f} />;
};
