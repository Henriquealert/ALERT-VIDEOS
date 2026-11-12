import { getStaticFiles, Img, staticFile } from "remotion";
import { C, F } from "../../ui/theme";

// Drop-in assets for "The Dot" (see docs/Alert Global Tech - The Dot README.md).
// Missing files never break a render: music, SFX and voiceover are skipped with a warning,
// and a missing logo falls back to the approved brand PNG or, failing that, a labelled grey box.

const logged = new Set<string>();
const once = (level: "warn" | "error", msg: string) => {
  if (logged.has(msg)) return;
  logged.add(msg);
  // eslint-disable-next-line no-console
  console[level](`[The Dot] ${msg}`);
};

// getStaticFiles() lists public/ in the Studio and during renders.
export const hasStatic = (path: string) => getStaticFiles().some((f) => f.name === path);

export const optionalAsset = (path: string, what: string): string | null => {
  if (hasStatic(path)) return staticFile(path);
  once("warn", `public/${path} not found: rendering without ${what}.`);
  return null;
};

// Ivory artwork only (used on ink and blue grounds here).
const LOGOS = {
  monogram: { svg: "logo/monogram.svg", png: "brand/alert-global-tech-monogram-ivory.png", ratio: 410 / 450 },
  wordmark: { svg: "logo/wordmark.svg", png: "brand/alert-global-tech-wordmark-ivory.png", ratio: 1214 / 458 },
} as const;

export const Logo: React.FC<{
  kind: keyof typeof LOGOS;
  height: number;
  style?: React.CSSProperties;
}> = ({ kind, height, style }) => {
  const l = LOGOS[kind];
  if (hasStatic(l.svg)) return <Img src={staticFile(l.svg)} style={{ height, width: "auto", display: "block", ...style }} />;
  if (hasStatic(l.png)) {
    once("error", `public/${l.svg} is missing: using the approved ${l.png} instead.`);
    return <Img src={staticFile(l.png)} style={{ height, width: height * l.ratio, display: "block", ...style }} />;
  }
  once("error", `public/${l.svg} is missing and no fallback exists: showing a placeholder.`);
  return (
    <div
      style={{
        height,
        width: height * l.ratio,
        background: C.line,
        color: C.ivory,
        fontFamily: F.sans,
        fontWeight: 700,
        fontSize: Math.max(12, height * 0.12),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        ...style,
      }}
    >
      LOGO MISSING: {l.svg}
    </div>
  );
};
