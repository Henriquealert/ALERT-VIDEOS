import { AbsoluteFill, Img, interpolate, spring, staticFile, useVideoConfig } from "remotion";
import { C, F, tag, useLayout } from "./theme";

// The approved Ivory lockup (a!ert + GLOBAL TECH). Always the real file, never redrawn or typeset.
// The render fails if it's missing, so a video can't ship without the logo.
export const LOGO_FILE = "brand/alert-global-tech-lockup-ivory.png";
export const LOGO_RATIO = 1214 / 588; // width / height of the supplied lockup

type Props = { u: number; frame: number; cta: string; ctaUrl: string | null; channel: string };

// The only place the logo appears: Ivory lockup centred on Deep Ink, lime pill CTA below,
// one blue-to-sky arrow at bottom-right, its tail bleeding off the bottom edge.
export const EndCard: React.FC<Props> = ({ u, frame, cta, ctaUrl, channel }) => {
  const { fps } = useVideoConfig();
  const { width, height, safeY } = useLayout();
  const logoIn = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const ctaIn = spring({ frame: frame - 18, fps, config: { damping: 200 }, durationInFrames: 30 });
  const arrowIn = spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 40 });
  const arrow = Math.min(width, height) * 0.42;

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <svg
        width={arrow}
        height={arrow}
        viewBox="0 0 100 100"
        style={{
          position: "absolute",
          right: u * 5,
          bottom: safeY - arrow * 0.32,
          opacity: 0.9 * arrowIn,
          transform: `translate(${interpolate(arrowIn, [0, 1], [u * 4, 0])}px, ${interpolate(arrowIn, [0, 1], [u * 4, 0])}px)`,
        }}
      >
        <defs>
          <linearGradient id="arrow-beam" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={C.blue} />
            <stop offset="0.7" stopColor={C.sky} />
            <stop offset="1" stopColor={C.skyLight} />
          </linearGradient>
        </defs>
        {/* Chunky up-right arrow */}
        <path d="M30 8 H92 V70 H74 V39 L21 92 L8 79 L61 26 H30 Z" fill="url(#arrow-beam)" />
      </svg>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", gap: u * 5 }}>
        <div style={{ opacity: logoIn, transform: `scale(${interpolate(logoIn, [0, 1], [0.96, 1])})` }}>
          {/* Clear space = the height of the "a"; never below the 120px minimum width */}
          <Img src={staticFile(LOGO_FILE)} style={{ height: u * 12, minWidth: 120, display: "block" }} />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: u * 1.8,
            opacity: ctaIn,
            transform: `translateY(${interpolate(ctaIn, [0, 1], [u * 2, 0])}px)`,
          }}
        >
          <div
            style={{
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: u * 3.4,
              color: C.ink,
              background: C.lime,
              padding: `${u * 1.5}px ${u * 4}px`,
              borderRadius: u * 5,
            }}
          >
            {cta}
          </div>
          {ctaUrl ? (
            <div style={{ fontFamily: F.sans, fontSize: u * 2.2, color: C.mutedDark }}>
              {ctaUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}
            </div>
          ) : null}
        </div>
      </AbsoluteFill>

      {/* Tag bottom-left, as on the brand's post layouts */}
      <div style={{ position: "absolute", left: u * 6, bottom: safeY + u * 6, ...tag(u * 2.2, C.mutedDark), opacity: ctaIn }}>
        {channel}
      </div>
    </AbsoluteFill>
  );
};
