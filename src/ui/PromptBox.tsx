import { interpolate, spring, useVideoConfig } from "remotion";
import { C, F } from "./theme";

type Props = {
  text: string;
  frame: number; // local frame, 0 = typing starts
  u: number;
  width: number;
  charsPerFrame?: number;
};

// Prompt box that types `text` letter by letter, then pulses the send button.
export const PromptBox: React.FC<Props> = ({ text, frame, u, width, charsPerFrame = 0.8 }) => {
  const { fps } = useVideoConfig();
  const typed = Math.min(text.length, Math.floor(Math.max(0, frame) * charsPerFrame));
  const doneAt = Math.ceil(text.length / charsPerFrame);
  const done = typed >= text.length;
  const caretOn = Math.floor(frame / 15) % 2 === 0;
  const pulse = spring({ frame: frame - doneAt - 6, fps, config: { damping: 9, mass: 0.6 } });
  const pulseScale = interpolate(pulse, [0, 0.5, 1], [1, 1.18, 1]);

  return (
    <div
      style={{
        width,
        display: "flex",
        alignItems: "center",
        gap: u * 2,
        background: C.ivory,
        border: `${Math.max(1, u * 0.18)}px solid ${C.skyLight}`,
        borderRadius: u * 2.2,
        padding: `${u * 2}px ${u * 2.4}px`,
        boxSizing: "border-box",
      }}
    >
      <div style={{ flex: 1, fontFamily: F.sans, fontSize: u * 3, color: C.ink, lineHeight: 1.35 }}>
        {text.slice(0, typed)}
        <span style={{ opacity: !done || caretOn ? 1 : 0, color: C.blue }}>|</span>
      </div>
      <div
        style={{
          width: u * 6,
          height: u * 6,
          flexShrink: 0,
          borderRadius: "50%",
          background: done ? C.blue : C.skyLight,
          transform: `scale(${done ? pulseScale : 1})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width={u * 2.6} height={u * 2.6} viewBox="0 0 24 24">
          <path d="M12 19V5M5 12l7-7 7 7" stroke={C.ivory} strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
};

export const promptDuration = (text: string, charsPerFrame = 0.8) => Math.ceil(text.length / charsPerFrame);
