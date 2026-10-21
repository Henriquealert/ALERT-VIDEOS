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

// The ONLY fonts allowed, as supplied in "Alert Global Tech - Brand Fonts" (public/fonts/).
// No other family may appear on screen; `npm run check-fonts` enforces it.
export const F = {
  headline: "DM Sans", // SemiBold 600, sentence case, left-aligned (brand Story layouts)
  numeral: "Archivo Narrow", // Bold 700: big numbers
  statement: "Archivo Narrow", // Bold Italic, uppercase: statement titles
  accent: "Instrument Serif", // Italic, one or two words only
  serif: "Instrument Serif", // Regular, when an upright serif is needed
  sans: "DM Sans", // UI text, body, eyebrows, tags
} as const;

// Static faces from the supplied files. Every weight used in code must be listed here.
const FONT_FILES: [string, string, string, "normal" | "italic"][] = [
  ["Archivo Narrow", "Archivo Narrow/static/ArchivoNarrow-Regular.ttf", "400", "normal"],
  ["Archivo Narrow", "Archivo Narrow/static/ArchivoNarrow-Italic.ttf", "400", "italic"],
  ["Archivo Narrow", "Archivo Narrow/static/ArchivoNarrow-Medium.ttf", "500", "normal"],
  ["Archivo Narrow", "Archivo Narrow/static/ArchivoNarrow-MediumItalic.ttf", "500", "italic"],
  ["Archivo Narrow", "Archivo Narrow/static/ArchivoNarrow-SemiBold.ttf", "600", "normal"],
  ["Archivo Narrow", "Archivo Narrow/static/ArchivoNarrow-SemiBoldItalic.ttf", "600", "italic"],
  ["Archivo Narrow", "Archivo Narrow/static/ArchivoNarrow-Bold.ttf", "700", "normal"],
  ["Archivo Narrow", "Archivo Narrow/static/ArchivoNarrow-BoldItalic.ttf", "700", "italic"],
  ["DM Sans", "DM Sans/static/DMSans-Regular.ttf", "400", "normal"],
  ["DM Sans", "DM Sans/static/DMSans-Italic.ttf", "400", "italic"],
  ["DM Sans", "DM Sans/static/DMSans-Medium.ttf", "500", "normal"],
  ["DM Sans", "DM Sans/static/DMSans-MediumItalic.ttf", "500", "italic"],
  ["DM Sans", "DM Sans/static/DMSans-SemiBold.ttf", "600", "normal"],
  ["DM Sans", "DM Sans/static/DMSans-SemiBoldItalic.ttf", "600", "italic"],
  ["DM Sans", "DM Sans/static/DMSans-Bold.ttf", "700", "normal"],
  ["DM Sans", "DM Sans/static/DMSans-BoldItalic.ttf", "700", "italic"],
  ["Instrument Serif", "Instrument Serif/InstrumentSerif-Regular.ttf", "400", "normal"],
  ["Instrument Serif", "Instrument Serif/InstrumentSerif-Italic.ttf", "400", "italic"],
];
for (const [family, file, weight, style] of FONT_FILES) {
  loadFont({ family, url: staticFile(`fonts/${file}`), weight, style, format: "truetype" });
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

// Tag: DM Sans 500, caps, light tracking (the brand font set has no mono face).
export const tag = (size: number, color: string): React.CSSProperties => ({
  fontFamily: F.sans,
  fontWeight: 500,
  textTransform: "uppercase",
  letterSpacing: "0.12em",
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
