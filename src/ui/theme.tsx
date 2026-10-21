import { loadFont } from "@remotion/fonts";
import { staticFile, useVideoConfig } from "remotion";

// Brand Guidelines 2026 (docs/Alert Global Tech - Brand Guidelines 2026.md).
// Core four, then the blue gradient stops and derived support tones. Nothing else goes on screen.
export const C = {
  blue: "#1644B8", // Electric Blue
  lime: "#E8FF58", // Acid Lime: accents and announcements, never in a gradient
  ink: "#101B32", // Deep Ink: default ground
  ivory: "#F5F4EF", // Soft Ivory
  sky: "#9DBDF5", // blue gradient stop
  skyLight: "#E2ECFA", // blue gradient end
  deepBlue: "#0B2A7A", // stepped-block gradient end
  raised: "#16233F", // raised surface on ink
  mutedDark: "#A9B3C7", // muted text on dark
  mutedLight: "#4A5468", // muted text on light
  hairline: "#2A3A5C", // hairline on dark
  line: "#6E7C99", // strong line, crosshairs
} as const;
// Contrast: never blue text on ink or ink text on blue.

export const F = {
  headline: "Archivo", // ExtraBold 800, tight leading, -2.5% tracking
  statement: "Archivo Narrow", // Bold Italic, uppercase
  accent: "Instrument Serif", // Italic, one or two words only
  sans: "DM Sans", // functional: UI text, body, eyebrows
  mono: "DM Mono", // tags, and the act 2 old-OS dialogs
} as const;
// Brand fonts only. Never add another family.

// Self-hosted from public/fonts (see LICENSES.md there); loadFont holds the render until they're ready.
const FONT_FILES: [string, string, string, "normal" | "italic"][] = [
  [F.headline, "archivo-latin-800-normal.woff2", "800", "normal"],
  [F.statement, "archivo-narrow-latin-700-italic.woff2", "700", "italic"],
  [F.accent, "instrument-serif-latin-400-italic.woff2", "400", "italic"],
  [F.sans, "dm-sans-latin-400-normal.woff2", "400", "normal"],
  [F.sans, "dm-sans-latin-500-normal.woff2", "500", "normal"],
  [F.sans, "dm-sans-latin-600-normal.woff2", "600", "normal"],
  [F.mono, "dm-mono-latin-500-normal.woff2", "500", "normal"],
];
for (const [family, file, weight, style] of FONT_FILES) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, style, format: "woff2" });
}

// Eyebrow label: DM Sans 600, caps, +20% tracking.
export const eyebrow = (size: number, color: string): React.CSSProperties => ({
  fontFamily: F.sans,
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.2em",
  fontSize: size,
  color,
});

// Tag: DM Mono 500, caps.
export const tag = (size: number, color: string): React.CSSProperties => ({
  fontFamily: F.mono,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.06em",
  fontSize: size,
  color,
});

// The coloured full stop that ends a headline (~19% of cap height).
// Lime on ink or blue, blue on ivory, ink or blue on lime.
export const Dot: React.FC<{ fontSize: number; color: string }> = ({ fontSize, color }) => {
  const d = fontSize * 0.72 * 0.19;
  return (
    <span
      style={{
        display: "inline-block",
        width: d,
        height: d,
        borderRadius: "50%",
        background: color,
        marginLeft: d * 0.35,
        verticalAlign: "baseline",
      }}
    />
  );
};

// Relative units so one layout serves 16x9, 4x5 and 9x16.
// `u` is 1% of the short side; `portrait` flips row layouts to columns;
// `safeY` keeps the Story/Reel top and bottom 250px clear.
export const useLayout = () => {
  const { width, height } = useVideoConfig();
  const u = Math.min(width, height) / 100;
  const safeY = height / width >= 16 / 9 - 0.01 ? (250 / 1920) * height : 0;
  return { width, height, u, portrait: height > width, safeY };
};
