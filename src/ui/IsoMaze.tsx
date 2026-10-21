import { interpolate, random } from "remotion";
import { C } from "./theme";
import { PixelCursor } from "./PixelCursor";

type Wall = { x1: number; y1: number; x2: number; y2: number; id: number };
type Cell = [number, number];

// Seeded depth-first maze on an n x n grid. Returns wall segments in grid units
// and the open-passage adjacency (used for wandering cursors).
const buildMaze = (n: number, seed: string) => {
  const visited = new Set<string>();
  const open = new Set<string>(); // "x,y|x,y" passages
  const key = (a: Cell, b: Cell) =>
    a[0] < b[0] || (a[0] === b[0] && a[1] < b[1]) ? `${a}|${b}` : `${b}|${a}`;
  const stack: Cell[] = [[0, 0]];
  visited.add("0,0");
  let i = 0;
  while (stack.length) {
    const [cx, cy] = stack[stack.length - 1];
    const next = (
      [
        [cx + 1, cy],
        [cx - 1, cy],
        [cx, cy + 1],
        [cx, cy - 1],
      ] as Cell[]
    ).filter(([x, y]) => x >= 0 && y >= 0 && x < n && y < n && !visited.has(`${x},${y}`));
    if (!next.length) {
      stack.pop();
      continue;
    }
    const pick = next[Math.floor(random(`${seed}-dfs-${i++}`) * next.length)];
    open.add(key([cx, cy], pick));
    visited.add(`${pick}`);
    stack.push(pick);
  }

  const walls: Wall[] = [];
  let id = 0;
  for (let x = 0; x < n; x++) {
    for (let y = 0; y < n; y++) {
      // East and south edge of each cell, plus the outer north/west border.
      if (x === n - 1 || !open.has(key([x, y], [x + 1, y]))) walls.push({ x1: x + 1, y1: y, x2: x + 1, y2: y + 1, id: id++ });
      if (y === n - 1 || !open.has(key([x, y], [x, y + 1]))) walls.push({ x1: x, y1: y + 1, x2: x + 1, y2: y + 1, id: id++ });
      if (x === 0) walls.push({ x1: 0, y1: y, x2: 0, y2: y + 1, id: id++ });
      if (y === 0) walls.push({ x1: x, y1: 0, x2: x + 1, y2: 0, id: id++ });
    }
  }

  const neighbours = (c: Cell): Cell[] =>
    (
      [
        [c[0] + 1, c[1]],
        [c[0] - 1, c[1]],
        [c[0], c[1] + 1],
        [c[0], c[1] - 1],
      ] as Cell[]
    ).filter((d) => open.has(key(c, d)));

  return { walls, neighbours };
};

type Props = {
  width: number;
  height: number;
  frame: number;
  seed: string;
  cells?: number;
  zoom?: number; // 1 = whole maze fits the frame
  tilt?: number; // 0 = isometric, 1 = top-down
  dissolve?: number; // 0..1, fraction of walls gone
  cursors?: number;
  cursorSize?: number;
};

export const IsoMaze: React.FC<Props> = ({
  width,
  height,
  frame,
  seed,
  cells = 10,
  zoom = 1,
  tilt = 0,
  dissolve = 0,
  cursors = 0,
  cursorSize = 40,
}) => {
  const { walls, neighbours } = buildMaze(cells, seed);

  // Fit the maze to the short side, then apply camera zoom around the centre.
  const s = (Math.min(width, height) / (cells * 1.25)) * zoom;
  const wallH = s * 0.55 * (1 - tilt);
  const cos = interpolate(tilt, [0, 1], [Math.cos(Math.PI / 6), 1]);
  const sin = interpolate(tilt, [0, 1], [Math.sin(Math.PI / 6), 1]);
  const skew = 1 - tilt; // iso rotates the grid 45°, top-down does not
  const half = cells / 2;
  const project = (x: number, y: number) => {
    const gx = x - half;
    const gy = y - half;
    const ix = (gx - gy) * cos * skew + gx * tilt;
    const iy = (gx + gy) * sin * skew + gy * tilt;
    return [width / 2 + ix * s, height / 2 + iy * s] as const;
  };

  // Draw back-to-front so nearer walls overlap farther ones.
  const sorted = [...walls].sort((a, b) => a.x1 + a.y1 + a.x2 + a.y2 - (b.x1 + b.y1 + b.x2 + b.y2));

  const faces = sorted.map((w) => {
    const gone = random(`${seed}-wall-${w.id}`) < dissolve;
    if (gone) return null;
    const [ax, ay] = project(w.x1, w.y1);
    const [bx, by] = project(w.x2, w.y2);
    const pts = `${ax},${ay} ${bx},${by} ${bx},${by - wallH} ${ax},${ay - wallH}`;
    return (
      <g key={w.id}>
        <polygon points={pts} fill={C.raised} fillOpacity={0.9} />
        <line x1={ax} y1={ay - wallH} x2={bx} y2={by - wallH} stroke={C.sky} strokeWidth={Math.max(1.5, s * 0.07)} />
        <line x1={ax} y1={ay} x2={bx} y2={by} stroke={C.blue} strokeOpacity={0.9} strokeWidth={Math.max(1, s * 0.04)} />
      </g>
    );
  });

  // Cursors wander cell to cell along open passages, one step every 12 frames.
  const STEP = 12;
  const cursorEls = Array.from({ length: cursors }).map((_, ci) => {
    let cell: Cell = [
      Math.floor(random(`${seed}-c${ci}-x`) * cells),
      Math.floor(random(`${seed}-c${ci}-y`) * cells),
    ];
    let prev = cell;
    const steps = Math.floor(frame / STEP);
    for (let k = 0; k <= steps; k++) {
      const opts = neighbours(cell);
      prev = cell;
      cell = opts[Math.floor(random(`${seed}-c${ci}-step-${k}`) * opts.length)] ?? cell;
    }
    const t = (frame % STEP) / STEP;
    const [px, py] = project(prev[0] + 0.5, prev[1] + 0.5);
    const [nx, ny] = project(cell[0] + 0.5, cell[1] + 0.5);
    return (
      <PixelCursor
        key={ci}
        x={interpolate(t, [0, 1], [px, nx])}
        y={interpolate(t, [0, 1], [py, ny]) - wallH * 0.6}
        size={cursorSize}
        opacity={1 - dissolve}
      />
    );
  });

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <svg width={width} height={height} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id={`glow-${seed}`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={s * 0.12} />
          </filter>
        </defs>
        <g filter={`url(#glow-${seed})`} opacity={0.8}>
          {faces}
        </g>
        <g>{faces}</g>
      </svg>
      {cursorEls}
    </div>
  );
};
