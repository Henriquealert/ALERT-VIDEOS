import { AbsoluteFill, Audio, Easing, Img, interpolate, spring, staticFile, useCurrentFrame } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { WORDMARK_FILE, WORDMARK_RATIO } from "../ui/Story";
import { C, Dot, F } from "../ui/theme";
import T from "./series-a-timeline.json";

// "Series A, sorted." 86 s explainer for the Series A Compliance bundle, 4:5, 30 fps.
// Fixed copy from Henrique's brief (23 Oct 2026); sent in LinkedIn messages to VC platform leads,
// so it must work with sound off: the voiceover is burned in as captions (and exported as .srt).
// Style follows the "Data, sorted." end card: Deep Ink throughout, a thin blue → sky beam down the
// centre, Ivory headlines in DM Sans SemiBold ending in the lime dot, Instrument Serif Italic on the
// accent words only, muted DM Sans support lines with " · " separators, lime pill CTA.
// Graphic elements: the beam, one line arrow (bottom-left) and the big "01/04" numerals. Nothing else.
// Lockup centred on the opening and closing scenes; wordmark top-left in between, never both at once.
// Every time below comes from src/videos/series-a-timeline.json, written by
// scripts/make-series-a-audio.py from the voiceover take, so text, voice and captions stay in sync.

export const SERIES_A_SORTED = { fps: T.fps, durationInFrames: T.durationInFrames, width: 1080, height: 1350 } as const;

const W = 1080;
const H = 1350;
const SIDE = 80;
const MIX = "audio/Alert Global Tech - Series A Sorted Mix.wav";
const [, TRIGGER, PAIN, TITLE, INSIDE, FUND, CLOSE, END] = T.scenes;
const LN = T.lines;
// Headlines rise in a fifth of a second before their voice line.
const LEAD = 6;
// Headline band, kept clear of the captions in the lower third.
const BAND = { top: 220, bottom: 1000 };

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const out = Easing.out(Easing.cubic);
// 0 → 1 over 0.5 s, eased out: the rise-and-fade every piece of text uses.
const rise = (fr: number, at: number, len = 15) => interpolate(fr, [at, at + len], [0, 1], { ...clamp, easing: out });
// 1 → 0 over a third of a second, for text leaving within a scene.
const leave = (fr: number, at: number | null) => (at === null ? 1 : interpolate(fr, [at, at + 10], [1, 0], clamp));

export const SeriesASorted: React.FC = () => {
  const fr = useCurrentFrame();
  const scenes = [Opening, Trigger, Pain, Title, Inside, Fund, Close];
  // One logo at a time: the lockup leaves before the wordmark arrives, and the reverse at the close.
  const wordmark = interpolate(fr, [TRIGGER, TRIGGER + 12, CLOSE - 12, CLOSE], [0, 1, 1, 0], clamp);
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Audio src={staticFile(MIX)} />
      <Beam fr={fr} />
      {scenes.map((Scene, i) => {
        const start = T.scenes[i];
        const end = T.scenes[i + 1];
        if (fr < start || fr >= end) return null;
        // Cross-fade over the ink ground: each scene fades out over its last 12 frames.
        const fade = end === END ? 1 : interpolate(fr, [end - 12, end], [1, 0], clamp);
        return (
          <AbsoluteFill key={i} style={{ opacity: fade }}>
            <Scene fr={fr} />
          </AbsoluteFill>
        );
      })}
      {wordmark > 0 ? (
        <Img
          src={staticFile(WORDMARK_FILE)}
          style={{ position: "absolute", left: SIDE, top: SIDE, width: 150, height: 150 / WORDMARK_RATIO, opacity: wordmark }}
        />
      ) : null}
      <LineArrow opacity={rise(fr, TRIGGER, 20)} />
      <Captions fr={fr} />
    </AbsoluteFill>
  );
};

type SceneProps = { fr: number };

// ---------- Scenes ----------

const Opening: React.FC<SceneProps> = ({ fr }) => <Lockup p={rise(fr, 30, 18)} leaveAt={TRIGGER - 15} fr={fr} top={H / 2 - 120} />;

const Trigger: React.FC<SceneProps> = ({ fr }) => {
  const second = LN.managed - LEAD;
  return (
    <Band>
      <Headline fr={fr} at={LN.soc2 - LEAD} overlay leaveAt={second - 12} text="Your first enterprise customer asks for SOC 2" />
      <Headline fr={fr} at={second} text="Every laptop now has to be managed. " accent="And provable" />
    </Band>
  );
};

const Pain: React.FC<SceneProps> = ({ fr }) => {
  const second = LN.lastday - LEAD;
  return (
    <Band>
      <Headline fr={fr} at={PAIN + 12} overlay leaveAt={second - 12} text="Day one: a laptop ready for every new hire" />
      <Headline fr={fr} at={second} text="Last day: the laptop back, wiped, logged" />
    </Band>
  );
};

const Title: React.FC<SceneProps> = ({ fr }) => (
  <Band align="center">
    <TitleLine fr={fr} at={TITLE + 10} />
    <Support p={rise(fr, LN.bundle - LEAD)} size={40} align="center" style={{ marginTop: 44 }}>
      The Series A Compliance bundle
    </Support>
  </Band>
);

const CARDS = [
  { at: INSIDE + 6, text: "Laptops, financed", sub: "Dell · HP · paid monthly" },
  { at: LN.c2 - 14, text: "Managed and secured", sub: "Microsoft Intune · Defender for Business" },
  { at: LN.c3 - 14, text: "Ready to work", sub: "Microsoft 365 · Copilot" },
  { at: LN.c4 - 14, text: "Audit evidence, built in", sub: "SOC 2 device evidence · onboarding and offboarding logs" },
];

const Inside: React.FC<SceneProps> = ({ fr }) => (
  <>
    {CARDS.map((card, i) => {
      const next = CARDS[i + 1];
      const leaveAt = next ? next.at - 12 : null;
      if (fr < card.at || (next && fr >= next.at)) return null;
      return (
        <Band key={i} justify="flex-start" style={{ paddingTop: 30 }}>
          <Numeral p={rise(fr, card.at) * leave(fr, leaveAt)} n={i + 1} of={CARDS.length} />
          <div style={{ height: 40 }} />
          <Headline fr={fr} at={card.at + 6} leaveAt={leaveAt} text={card.text} size={104} />
          <Support p={rise(fr, card.at + 18) * leave(fr, leaveAt)} size={40} style={{ marginTop: 36 }}>
            {card.sub}
          </Support>
        </Band>
      );
    })}
  </>
);

const Fund: React.FC<SceneProps> = ({ fr }) => {
  const steps = [LN.price, LN.runway, LN.supplier, LN.languages].map((f) => f - LEAD);
  // Earlier lines step back a little as each new one arrives, so the eye goes to the newest.
  const dim = (i: number) => (i + 1 < steps.length ? interpolate(fr, [steps[i + 1], steps[i + 1] + 12], [1, 0.55], clamp) : 1);
  return (
    <Band justify="flex-start" style={{ paddingTop: 60, gap: 34 }}>
      <div style={{ opacity: dim(0) }}>
        <Headline fr={fr} at={steps[0]} text="One monthly price per employee" size={72} />
      </div>
      <div style={{ opacity: dim(1) }}>
        <Headline fr={fr} at={steps[1]} text="Cash stays in the runway" size={72} />
      </div>
      <div style={{ opacity: dim(2) }}>
        <Headline fr={fr} at={steps[2]} text="One supplier, from quote to setup" size={72} />
      </div>
      <Support p={rise(fr, steps[3])} size={46} style={{ marginTop: 6 }}>
        English · Spanish · Portuguese
      </Support>
      <Support p={rise(fr, LN.languages + 66)} size={30} style={{ position: "absolute", left: 0, top: BAND.bottom - BAND.top - 40 }}>
        Sourced through TD SYNNEX
      </Support>
    </Band>
  );
};

const Close: React.FC<SceneProps> = ({ fr }) => {
  const cta = spring({ frame: fr - LN.cta, fps: T.fps, config: { damping: 12, stiffness: 170, mass: 0.7 } });
  return (
    <>
      <Lockup p={rise(fr, CLOSE + 6, 18)} fr={fr} top={250} />
      <div style={{ position: "absolute", left: 0, top: 520, width: W, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <TitleLine fr={fr} at={CLOSE + 24} />
      </div>
      {cta > 0 ? (
        <div
          style={{
            position: "absolute",
            left: W / 2,
            top: 790,
            transform: `translate(-50%, -50%) scale(${cta})`,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 44,
            lineHeight: 1,
            color: C.ink,
            background: C.lime,
            borderRadius: 999,
            padding: "28px 60px 30px",
            whiteSpace: "nowrap",
          }}
        >
          Book a Call
        </div>
      ) : null}
      <Support p={rise(fr, LN.cta + 10)} size={34} align="center" style={{ position: "absolute", left: 0, top: 880, width: W }}>
        alertglobaltech.com
      </Support>
    </>
  );
};

// ---------- Pieces ----------

// The thin vertical beam down the centre: Electric Blue fading to sky, with a faint blue glow.
// It draws top to bottom in the opening, then stays. Its lower end fades out above the captions.
const Beam: React.FC<{ fr: number }> = ({ fr }) => {
  const draw = interpolate(fr, [0, 42], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  // Brightest on the lockup and title scenes, quieter behind the headlines.
  const glow = interpolate(
    fr,
    [TRIGGER - 12, TRIGGER, TITLE - 12, TITLE, INSIDE - 12, INSIDE, CLOSE - 12, CLOSE],
    [1, 0.6, 0.6, 1, 1, 0.6, 0.6, 1],
    clamp,
  );
  const fadeToCaptions = "transparent 0%, transparent 22%";
  return (
    <div
      style={{
        position: "absolute",
        left: W / 2 - 120,
        top: 0,
        width: 240,
        height: H,
        opacity: glow,
        clipPath: `inset(0 0 ${(1 - draw) * 100}% 0)`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 60,
          top: 0,
          width: 120,
          height: H,
          background: `linear-gradient(0deg, ${fadeToCaptions}, ${C.blue} 45%, transparent 100%)`,
          opacity: 0.35,
          filter: "blur(26px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 118,
          top: 0,
          width: 4,
          height: H,
          background: `linear-gradient(0deg, ${fadeToCaptions}, ${C.blue} 40%, ${C.sky} 70%, transparent 100%)`,
        }}
      />
    </div>
  );
};

// The approved Ivory lockup, centred. Never redrawn; rises and fades in like the type.
const Lockup: React.FC<{ fr: number; p: number; top: number; leaveAt?: number }> = ({ fr, p, top, leaveAt }) => {
  const w = 420;
  const o = p * (leaveAt === undefined ? 1 : interpolate(fr, [leaveAt, leaveAt + 15], [1, 0], clamp));
  return (
    <Img
      src={staticFile(LOGO_FILE)}
      style={{
        position: "absolute",
        left: W / 2 - w / 2,
        top,
        width: w,
        height: w / LOGO_RATIO,
        opacity: o,
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    />
  );
};

// Flex column over the headline band. Scenes centre their text in it unless told otherwise.
const Band: React.FC<{
  children: React.ReactNode;
  align?: "left" | "center";
  justify?: "center" | "flex-start";
  style?: React.CSSProperties;
}> = ({ children, align = "left", justify = "center", style }) => (
  <div
    style={{
      position: "absolute",
      left: SIDE,
      top: BAND.top,
      width: W - 2 * SIDE,
      height: BAND.bottom - BAND.top,
      display: "flex",
      flexDirection: "column",
      justifyContent: justify,
      alignItems: align === "left" ? "flex-start" : "center",
      ...style,
    }}
  >
    {children}
  </div>
);

// The lime dot lands last on every headline, with a small scale pop.
const PopDot: React.FC<{ fr: number; at: number; size: number }> = ({ fr, at, size }) => {
  const s = spring({ frame: fr - at, fps: T.fps, config: { damping: 10, stiffness: 200, mass: 0.6 } });
  return (
    <span style={{ display: "inline-block", transform: `scale(${s})`, transformOrigin: "60% 70%" }}>
      <Dot fontSize={size} color={C.lime} />
    </span>
  );
};

// Headline: DM Sans SemiBold in Ivory, sentence case, tight leading, ending in the lime dot.
// `accent` sets the closing words in Instrument Serif Italic (never coloured as well).
// `overlay` takes the headline out of the flow, so the one replacing it lands in the same spot.
const Headline: React.FC<{
  fr: number;
  at: number;
  leaveAt?: number | null;
  overlay?: boolean;
  text: string;
  accent?: string;
  size?: number;
}> = ({ fr, at, leaveAt = null, overlay = false, text, accent, size = 96 }) => {
  if (fr < at || (leaveAt !== null && fr > leaveAt + 10)) return null;
  const p = rise(fr, at);
  return (
    <div
      style={{
        fontFamily: F.headline,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1.0,
        letterSpacing: "-0.025em",
        color: C.ivory,
        opacity: p * leave(fr, leaveAt),
        transform: `translateY(${(1 - p) * 24}px)`,
        textWrap: "balance",
        ...(overlay ? { position: "absolute" as const } : {}),
      }}
    >
      {text}
      {accent ? (
        <span style={{ fontFamily: F.accent, fontStyle: "italic", fontWeight: 400, fontSize: size * 1.12, letterSpacing: "-0.01em" }}>
          {accent}
        </span>
      ) : null}
      <PopDot fr={fr} at={at + 14} size={size} />
    </div>
  );
};

// "Series A, sorted" with the lime dot: the title card and the close.
const TitleLine: React.FC<{ fr: number; at: number }> = ({ fr, at }) => {
  const p = rise(fr, at, 18);
  const size = 118;
  return (
    <div
      style={{
        fontFamily: F.headline,
        fontWeight: 600,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: "-0.03em",
        color: C.ivory,
        whiteSpace: "nowrap",
        opacity: p,
        transform: `translateY(${(1 - p) * 24}px)`,
      }}
    >
      Series A,{" "}
      <span style={{ fontFamily: F.accent, fontStyle: "italic", fontWeight: 400, fontSize: size * 1.12, letterSpacing: "-0.01em" }}>
        sorted
      </span>
      <PopDot fr={fr} at={at + 18} size={size} />
    </div>
  );
};

// Muted DM Sans support line (product names separated by " · ").
const Support: React.FC<{
  p: number;
  size: number;
  align?: "left" | "center";
  style?: React.CSSProperties;
  children: React.ReactNode;
}> = ({ p, size, align = "left", style, children }) => (
  <div
    style={{
      fontFamily: F.sans,
      fontWeight: 500,
      fontSize: size,
      lineHeight: 1.3,
      letterSpacing: "0.01em",
      color: C.mutedDark,
      textAlign: align,
      opacity: p,
      transform: `translateY(${(1 - p) * 20}px)`,
      ...style,
    }}
  >
    {children}
  </div>
);

// Big Archivo Narrow numeral, "01/04": the number in Ivory, the total muted.
const Numeral: React.FC<{ p: number; n: number; of: number }> = ({ p, n, of }) => (
  <div
    style={{
      fontFamily: F.numeral,
      fontWeight: 700,
      fontSize: 168,
      lineHeight: 0.9,
      letterSpacing: "-0.01em",
      color: C.ivory,
      opacity: p,
      transform: `translateY(${(1 - p) * 24}px)`,
    }}
  >
    {String(n).padStart(2, "0")}
    <span style={{ color: C.mutedDark }}>/{String(of).padStart(2, "0")}</span>
  </div>
);

// The one thin line arrow, bottom-left, from the first headline scene to the end.
const LineArrow: React.FC<{ opacity: number }> = ({ opacity }) => (
  <svg width={96} height={36} viewBox="0 0 96 36" style={{ position: "absolute", left: SIDE, top: H - SIDE - 36, opacity }}>
    <path d="M3,18 H93 M76,3 L93,18 L76,33" fill="none" stroke={C.ivory} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// Burned-in voiceover: DM Sans 500, Ivory on ink, two lines at most, lower third,
// below the headline band. Cue times come from the take's word times.
const Captions: React.FC<{ fr: number }> = ({ fr }) => {
  const cue = T.captions.find(([a, b]) => fr >= (a as number) && fr < (b as number));
  if (!cue) return null;
  const [a, b, text] = cue as [number, number, string];
  const o = interpolate(fr, [a, a + 4, b - 4, b], [0, 1, 1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: SIDE + 20,
        width: W - 2 * SIDE - 40,
        bottom: 172,
        textAlign: "center",
        fontFamily: F.sans,
        fontWeight: 500,
        fontSize: 42,
        lineHeight: 1.3,
        color: C.ivory,
        textWrap: "balance",
        opacity: o,
      }}
    >
      {text}
    </div>
  );
};
