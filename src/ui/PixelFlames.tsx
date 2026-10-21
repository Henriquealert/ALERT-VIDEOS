import { random } from "remotion";
import { C } from "./theme";

type Props = {
  width: number;
  block: number; // pixel block size
  frame: number;
  seed: string;
  intensity?: number; // 0..1, scales flame height
};

// Pixel flames in the blue family (stepped, never lime), anchored to the bottom edge of their box.
export const PixelFlames: React.FC<Props> = ({ width, block, frame, seed, intensity = 1 }) => {
  const cols = Math.max(1, Math.floor(width / block));
  const maxRows = 6;
  // Flames flicker on a 3-frame step so they read as pixel animation, not smooth motion.
  const step = Math.floor(frame / 3);
  return (
    <svg
      width={cols * block}
      height={maxRows * block}
      shapeRendering="crispEdges"
      style={{ position: "absolute", left: 0, top: -maxRows * block, overflow: "visible" }}
    >
      {Array.from({ length: cols }).map((_, cx) => {
        const base = random(`${seed}-col-${cx}`) * 0.6 + 0.4;
        const flicker = random(`${seed}-${cx}-${step}`) * 0.5 + 0.5;
        const rows = Math.round(base * flicker * maxRows * intensity);
        return Array.from({ length: rows }).map((__, r) => {
          const t = r / maxRows;
          return (
            <rect
              key={`${cx}-${r}`}
              x={cx * block}
              y={(maxRows - 1 - r) * block}
              width={block}
              height={block}
              fill={t < 0.3 ? C.skyLight : t < 0.6 ? C.sky : C.blue}
              opacity={1 - t * 0.5}
            />
          );
        });
      })}
    </svg>
  );
};
