import { C, F } from "./theme";
import { PixelFlames } from "./PixelFlames";

type Props = {
  x: number;
  y: number;
  width: number;
  u: number;
  title: string;
  message: string;
  scale?: number;
  frame: number;
  seed: string;
  flames?: number; // 0 hides flames
};

// Old-OS dialog: bevelled frame, title bar with close box, message, OK button.
export const PixelWindow: React.FC<Props> = ({
  x,
  y,
  width,
  u,
  title,
  message,
  scale = 1,
  frame,
  seed,
  flames = 0,
}) => {
  const bevel = Math.max(2, Math.round(u * 0.35));
  const bevelBox = (raised: boolean): React.CSSProperties => ({
    borderStyle: "solid",
    borderWidth: bevel,
    borderColor: raised
      ? `${C.skyLight} ${C.line} ${C.line} ${C.skyLight}`
      : `${C.line} ${C.skyLight} ${C.skyLight} ${C.line}`,
  });

  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width,
        transform: `scale(${scale})`,
        transformOrigin: "center",
        background: C.ivory,
        ...bevelBox(true),
      }}
    >
      {flames > 0 ? (
        <PixelFlames width={width} block={u * 1.1} frame={frame} seed={seed} intensity={flames} />
      ) : null}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: C.blue,
          color: C.ivory,
          fontFamily: F.pixel,
          fontSize: u * 1.9,
          padding: `${u * 0.5}px ${u * 0.9}px`,
        }}
      >
        <span>{title}</span>
        <span
          style={{
            width: u * 2,
            height: u * 2,
            lineHeight: `${u * 1.7}px`,
            textAlign: "center",
            background: C.ivory,
            color: C.ink,
            ...bevelBox(true),
            borderWidth: Math.max(1, bevel / 2),
          }}
        >
          x
        </span>
      </div>
      <div
        style={{
          fontFamily: F.pixel,
          fontSize: u * 2.4,
          lineHeight: 1.25,
          color: C.ink,
          padding: `${u * 1.8}px ${u * 1.8}px ${u * 1.2}px`,
        }}
      >
        {message}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: `0 ${u * 1.8}px ${u * 1.5}px` }}>
        <div
          style={{
            fontFamily: F.pixel,
            fontSize: u * 1.9,
            color: C.ink,
            background: C.skyLight,
            padding: `${u * 0.4}px ${u * 2.6}px`,
            ...bevelBox(true),
          }}
        >
          OK
        </div>
      </div>
    </div>
  );
};
