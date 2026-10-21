import { AbsoluteFill, Img, interpolate, spring, staticFile, useVideoConfig } from "remotion";
import { BlockStack, StoryChrome } from "./Story";
import { C, F, useLayout } from "./theme";

// The approved Ivory lockup (a!ert + GLOBAL TECH). Always the real file, never redrawn or typeset.
// The render fails if it's missing, so a video can't ship without the logo.
export const LOGO_FILE = "brand/alert-global-tech-lockup-ivory.png";
export const LOGO_RATIO = 1214 / 588; // width / height of the supplied lockup

type Props = { u: number; frame: number; cta: string; ctaUrl: string | null; channel: string };

// The lockup's only appearance: Ivory lockup centred on Deep Ink, lime pill CTA below,
// block composition bottom-right and line arrow bottom-left (brand Story layout).
export const EndCard: React.FC<Props> = ({ u, frame, cta, ctaUrl, channel }) => {
  const { fps } = useVideoConfig();
  const { width, height, safeY } = useLayout();
  const logoIn = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 30 });
  const ctaIn = spring({ frame: frame - 18, fps, config: { damping: 200 }, durationInFrames: 30 });
  const arrowIn = spring({ frame: frame - 8, fps, config: { damping: 200 }, durationInFrames: 40 });

  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {/* Block composition bottom-right, as in the brand Story layouts */}
      <div style={{ position: "absolute", right: u * 6.5, bottom: Math.max(safeY, u * 6.5), opacity: arrowIn }}>
        <BlockStack unit={Math.min(width, height) * 0.13} frame={frame - 8} ground="ink" />
      </div>

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

      <StoryChrome u={u} safeY={safeY} ground="ink" wordmark={false} arrow={ctaIn} />
    </AbsoluteFill>
  );
};
