import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VideoSpec } from "../spec";
import { ChecklistCard, CompareTable, ScoreBars } from "../ui/Cards";
import { PromptBox, promptDuration } from "../ui/PromptBox";
import { Badge, StoryChrome } from "../ui/Story";
import { C, F, useLayout } from "../ui/theme";

const TYPE_FROM = 18;
const CARD_GAP = 55; // slow, even holds between cards

// Act 4: hard cut to a quiet Soft Ivory UI. Prompt types, answer appears, then the UI cards.
export const Act4Calm: React.FC<{ spec: VideoSpec }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const layout = useLayout();
  const { width, height, portrait, safeY } = layout;
  // Landscape has spare room, so the calm UI scales up a little to stay legible on phones.
  const u = layout.u * (portrait ? 1 : 1.2);

  const answerAt = TYPE_FROM + promptDuration(spec.prompt) + 30;
  const cardsAt = answerAt + 75;
  const answerIn = spring({ frame: frame - answerAt, fps, config: { damping: 200 }, durationInFrames: 30 });
  const stackCards = height / width > 1.5; // 9x16 stacks; 16x9 and 4x5 sit in a row
  const contentW = portrait ? width * 0.86 : Math.min(width * 0.74, u * 130);

  // Chips repeat the card titles so the answer previews what follows.
  const chips = spec.uiCards.map((c) => ("title" in c ? c.title : null)).filter((t): t is string => !!t);

  return (
    <AbsoluteFill style={{ background: C.ivory, alignItems: "center", justifyContent: "center", padding: `${safeY}px 0` }}>
      <div style={{ width: contentW, display: "flex", flexDirection: "column", gap: u * 3 }}>
        <div style={{ display: "flex" }}>
          <Badge text={spec.channel} size={u * 1.8} />
        </div>

        <PromptBox text={spec.prompt} frame={frame - TYPE_FROM} u={u} width={contentW} />

        <div
          style={{
            opacity: answerIn,
            transform: `translateY(${interpolate(answerIn, [0, 1], [u * 2, 0])}px)`,
            background: C.ivory,
            border: `${Math.max(1, u * 0.15)}px solid ${C.skyLight}`,
            borderRadius: u * 1.8,
            padding: u * 2.6,
          }}
        >
          <div style={{ fontFamily: F.sans, fontSize: u * 2.7, lineHeight: 1.45, color: C.ink }}>{spec.answer}</div>
          {chips.length ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: u * 1.2, marginTop: u * 2 }}>
              {chips.map((chip, i) => {
                const chipIn = spring({ frame: frame - answerAt - 20 - i * 8, fps, config: { damping: 200 } });
                return (
                  <span
                    key={chip}
                    style={{
                      opacity: chipIn,
                      fontFamily: F.sans,
                      fontWeight: 500,
                      fontSize: u * 2,
                      color: C.blue,
                      background: C.skyLight,
                      borderRadius: u * 3,
                      padding: `${u * 0.7}px ${u * 1.8}px`,
                    }}
                  >
                    {chip}
                  </span>
                );
              })}
            </div>
          ) : null}
        </div>

        <div style={{ display: "flex", flexDirection: stackCards ? "column" : "row", gap: u * 2.4, alignItems: "stretch" }}>
          {spec.uiCards.map((card, i) => {
            const local = frame - cardsAt - i * CARD_GAP;
            // Cards reserve their space from the start so nothing shifts when they appear.
            const hidden = local < 0;
            const body =
              card.kind === "checklist" ? (
                <ChecklistCard u={u} frame={local} title={card.title} items={card.items} />
              ) : card.kind === "compare" ? (
                <CompareTable u={u} frame={local} title={card.title} rows={card.rows} />
              ) : (
                <ScoreBars u={u} frame={local} items={card.items} />
              );
            return (
              <div key={i} style={{ flex: 1, minWidth: 0, display: "flex", visibility: hidden ? "hidden" : "visible" }}>
                {body}
              </div>
            );
          })}
        </div>
      </div>
      <StoryChrome u={layout.u} safeY={safeY} ground="ivory" wordmark={false} />
    </AbsoluteFill>
  );
};
