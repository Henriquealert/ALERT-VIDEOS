import { z } from "zod";

// One video = one spec file in data/specs/<slug>.json, built from one partner_content row.
export const VideoSpec = z
  .object({
    slug: z.string(), // e.g. "copilot-ebook"
    sourceRowId: z.string().uuid(), // partner_content.id
    channel: z.string(), // partner_content.channel, shown as an eyebrow label and the end-card tag
    hook: z.string().max(24), // act 1 statement title, 2-3 words
    painPoints: z.array(z.string().max(40)).min(3).max(10), // act 2 dialog windows
    stat: z.string().max(8).nullable(), // act 2 big Archivo numeral, only if it is in the row
    statSource: z.string().nullable(), // where the number comes from (required if stat is set)
    prompt: z.string().max(70), // act 4 typed request
    answer: z.string().max(220), // act 4 answer card
    uiCards: z
      .array(
        z.discriminatedUnion("kind", [
          z.object({ kind: z.literal("checklist"), title: z.string(), items: z.array(z.string()).max(5) }),
          z.object({
            kind: z.literal("compare"),
            title: z.string(),
            rows: z.array(z.object({ label: z.string(), value: z.string() })).max(4),
          }),
          z.object({
            kind: z.literal("scores"),
            items: z.array(z.object({ label: z.string(), level: z.number().int().min(1).max(5) })).max(3),
          }),
        ])
      )
      .min(1)
      .max(3),
    cta: z.string(), // one per video, title-style capitals: "Talk to an Expert", "Request a Quote", "Learn More"
    ctaUrl: z.string().url().nullable(),
  })
  .refine((s) => !s.stat || !!s.statSource, { message: "stat needs statSource" });

export type VideoSpec = z.infer<typeof VideoSpec>;
