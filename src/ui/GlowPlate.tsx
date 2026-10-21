import { AbsoluteFill, interpolate, random } from "remotion";
import { C } from "./theme";

// Generative glow plate: slow drifting blue glows (gradients are allowed on blue only),
// layered over a Deep Ink background.
export const GlowPlate: React.FC<{ frame: number; seed: string; strength?: number }> = ({
  frame,
  seed,
  strength = 1,
}) => {
  const blobs = Array.from({ length: 4 }).map((_, i) => {
    const bx = random(`${seed}-gx-${i}`) * 100;
    const by = random(`${seed}-gy-${i}`) * 100;
    const drift = Math.sin(frame / 90 + i * 1.7) * 6;
    const size = 35 + random(`${seed}-gs-${i}`) * 30;
    const color = i % 2 === 0 ? C.blue : C.deepBlue;
    return `radial-gradient(circle at ${bx + drift}% ${by - drift}%, ${color} 0%, transparent ${size}%)`;
  });
  return (
    <AbsoluteFill
      style={{
        backgroundImage: blobs.join(","),
        opacity: interpolate(strength, [0, 1], [0, 0.7]),
      }}
    />
  );
};
