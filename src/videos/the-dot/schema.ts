import { z } from "zod";

// Props for every "The Dot" composition. Each card routes to the destination at the same index.
export const theDotSchema = z.object({
  requestLine: z.string().default("New team starts Monday."),
  cards: z.array(z.string()).length(4).default(["Laptops", "Microsoft 365 licences", "Copilot", "Setup and training"]),
  destinations: z.array(z.string()).length(4).default(["Dell · HP", "Microsoft 365", "Copilot", "Certiport training"]),
  steps: z.array(z.string()).length(5).default(["Quote", "Order", "Configure", "Deliver", "Train"]),
  languages: z.string().default("EN · ES · PT"),
  headline: z.string().default("NEW TEAM, SORTED"),
  brandLine: z.string().default("Hardware, software and AI, sorted"),
  cta: z.string().default("REQUEST A QUOTE · ALERTGLOBAL.TECH"),
  // One line of copy for scenes 3, 4 and 5 (the film has no voiceover; the text carries it).
  sceneLines: z
    .object({ s3: z.string(), s4: z.string(), s5: z.string() })
    .default({
      s3: "That's laptops, licences, Copilot and setup.",
      s4: "One supplier routes it all.",
      s5: "From quote to setup, in English, Spanish or Portuguese.",
    }),
});

export type TheDotProps = z.infer<typeof theDotSchema>;

export const THE_DOT_DEFAULTS: TheDotProps = theDotSchema.parse({});

// Cut-downs: same build, different props.
// TODO: these two still use the default cards/destinations (laptops, licences...).
// Give each its own card and destination content (and S3 scene line) before rendering.
export const THE_DOT_NETWORK: TheDotProps = theDotSchema.parse({
  requestLine: "Office move next month.",
  headline: "NETWORK, SORTED",
});
export const THE_DOT_COPILOT: TheDotProps = theDotSchema.parse({
  requestLine: "Sales wants AI.",
  headline: "COPILOT, SORTED",
});
