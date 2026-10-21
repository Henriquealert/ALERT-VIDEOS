import { interpolate, spring, useVideoConfig } from "remotion";
import { C, F, eyebrow } from "./theme";

// Shared card shell for the calm act: ivory on ivory, a light hairline border, no shadow.
export const Card: React.FC<{ u: number; frame: number; title?: string; children: React.ReactNode }> = ({
  u,
  frame,
  title,
  children,
}) => {
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 200 }, durationInFrames: 24 });
  return (
    <div
      style={{
        flex: 1,
        minWidth: 0,
        background: C.ivory,
        border: `${Math.max(1, u * 0.15)}px solid ${C.skyLight}`,
        borderRadius: u * 1.8,
        padding: u * 2.6,
        opacity: enter,
        transform: `translateY(${interpolate(enter, [0, 1], [u * 3, 0])}px)`,
      }}
    >
      {title ? <div style={{ ...eyebrow(u * 1.7, C.mutedLight), marginBottom: u * 1.6 }}>{title}</div> : null}
      {children}
    </div>
  );
};

const ease = (frame: number, start: number, len: number) =>
  interpolate(frame, [start, start + len], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

export const ChecklistCard: React.FC<{ u: number; frame: number; title: string; items: string[] }> = ({
  u,
  frame,
  title,
  items,
}) => (
  <Card u={u} frame={frame} title={title}>
    {items.map((item, i) => {
      const tick = ease(frame, 20 + i * 18, 10);
      return (
        <div key={i} style={{ display: "flex", alignItems: "center", gap: u * 1.4, marginTop: i ? u * 1.3 : 0 }}>
          <div
            style={{
              width: u * 2.6,
              height: u * 2.6,
              flexShrink: 0,
              borderRadius: u * 0.6,
              border: `${Math.max(1, u * 0.2)}px solid ${tick > 0 ? C.blue : C.line}`,
              background: tick >= 1 ? C.blue : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width={u * 1.8} height={u * 1.8} viewBox="0 0 24 24">
              <path
                d="M4 12.5l5 5L20 6.5"
                stroke={C.ivory}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={26}
                strokeDashoffset={26 * (1 - tick)}
              />
            </svg>
          </div>
          <span style={{ fontFamily: F.sans, fontSize: u * 2.5, color: C.ink, opacity: 0.55 + tick * 0.45 }}>
            {item}
          </span>
        </div>
      );
    })}
  </Card>
);

export const CompareTable: React.FC<{
  u: number;
  frame: number;
  title: string;
  rows: { label: string; value: string }[];
}> = ({ u, frame, title, rows }) => (
  <Card u={u} frame={frame} title={title}>
    {rows.map((r, i) => {
      const show = ease(frame, 16 + i * 14, 12);
      return (
        <div
          key={i}
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: u * 2,
            padding: `${u * 1.1}px 0`,
            borderTop: i ? `${Math.max(1, u * 0.12)}px solid ${C.skyLight}` : "none",
            opacity: show,
            fontFamily: F.sans,
            fontSize: u * 2.3,
          }}
        >
          <span style={{ color: C.mutedLight }}>{r.label}</span>
          <span style={{ color: C.ink, fontWeight: 600, textAlign: "right" }}>{r.value}</span>
        </div>
      );
    })}
  </Card>
);

export const ScoreBars: React.FC<{ u: number; frame: number; items: { label: string; level: number }[] }> = ({
  u,
  frame,
  items,
}) => (
  <Card u={u} frame={frame}>
    {items.map((it, i) => {
      const fill = ease(frame, 18 + i * 12, 30) * (it.level / 5);
      return (
        <div key={i} style={{ marginTop: i ? u * 1.8 : 0 }}>
          <div style={{ ...eyebrow(u * 1.7, C.mutedLight), marginBottom: u * 0.7 }}>{it.label}</div>
          <div style={{ height: u * 1.4, borderRadius: u, background: C.skyLight, overflow: "hidden" }}>
            <div style={{ width: `${fill * 100}%`, height: "100%", borderRadius: u, background: C.blue }} />
          </div>
        </div>
      );
    })}
  </Card>
);
