import { useCurrentFrame } from "remotion";
import { dotAt, type DotKey } from "./keyframes";

// The one dot. A single absolutely positioned layer above every scene, never re-created:
// position, size, colour and opacity all come from the keyframe table for the current frame.
// Solid colour only: no gradient, shadow or glow.
export const TheDot: React.FC<{ keys: DotKey[] }> = ({ keys }) => {
  const frame = useCurrentFrame();
  const s = dotAt(keys, frame);
  return (
    <div
      style={{
        position: "absolute",
        left: s.x - s.d / 2,
        top: s.y - s.d / 2,
        width: s.d,
        height: s.d,
        borderRadius: "50%",
        background: s.color,
        opacity: s.o,
        pointerEvents: "none",
      }}
    />
  );
};
