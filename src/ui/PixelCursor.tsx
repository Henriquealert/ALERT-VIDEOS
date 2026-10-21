import { C } from "./theme";

// Classic 1-bit arrow, 12x19 pixels. "#" = outline, "." = fill.
const ARROW = [
  "#",
  "##",
  "#.#",
  "#..#",
  "#...#",
  "#....#",
  "#.....#",
  "#......#",
  "#.......#",
  "#........#",
  "#.........#",
  "#......#####",
  "#...#..#",
  "#..##..#",
  "#.#  #..#",
  "##   #..#",
  "#     #..#",
  "      #..#",
  "       ##",
];

type Props = {
  x: number;
  y: number;
  size: number; // rendered height in px
  clicking?: boolean; // shows a click ring
  opacity?: number;
};

export const PixelCursor: React.FC<Props> = ({ x, y, size, clicking = false, opacity = 1 }) => {
  const px = size / ARROW.length;
  return (
    <div style={{ position: "absolute", left: x, top: y, opacity, pointerEvents: "none" }}>
      {clicking ? (
        <div
          style={{
            position: "absolute",
            left: -size * 0.35,
            top: -size * 0.35,
            width: size * 0.7,
            height: size * 0.7,
            border: `${px * 2}px solid ${C.lime}`,
          }}
        />
      ) : null}
      <svg width={12 * px} height={size} shapeRendering="crispEdges">
        {ARROW.flatMap((row, ry) =>
          row.split("").map((ch, rx) =>
            ch === " " ? null : (
              <rect
                key={`${rx}-${ry}`}
                x={rx * px}
                y={ry * px}
                width={px + 0.5}
                height={px + 0.5}
                fill={ch === "#" ? C.ink : C.ivory}
              />
            )
          )
        )}
      </svg>
    </div>
  );
};
