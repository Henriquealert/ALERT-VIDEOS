// "The Dot" voiceover lines: file in public/vo/, the words, and the frame each line starts.
// Plain data with no imports, so scripts/generate-vo.ts can load it in Node.
// `sceneEnd` is the first frame of the next scene: a line must finish before it.

export type VoLine = { file: string; text: string; from: number; sceneEnd: number };
export type VoScene = "s2" | "s3" | "s4" | "s5" | "s6" | "s7";
export type VoSet = Record<VoScene, VoLine>;

const shared = {
  s3: { file: "vo-s3.mp3", text: "That's laptops, licences, Copilot and setup.", from: 160, sceneEnd: 270 },
  s4: { file: "vo-s4.mp3", text: "One supplier routes it all.", from: 285, sceneEnd: 390 },
  s5: { file: "vo-s5.mp3", text: "From quote to setup, in English, Spanish or Portuguese.", from: 398, sceneEnd: 510 },
  s7: { file: "vo-s7.mp3", text: "Hardware, software and AI. Sorted.", from: 640, sceneEnd: 720 },
};

export const VO_SETS = {
  main: {
    s2: { file: "vo-s2.mp3", text: "New team starts Monday.", from: 66, sceneEnd: 150 },
    ...shared,
    s6: { file: "vo-s6.mp3", text: "Sorted.", from: 572, sceneEnd: 630 },
  },
  // TODO (cut-downs): S3 and S4 lines still describe the default cards; rewrite them with the cut-down's own cards.
  network: {
    s2: { file: "vo-network-s2.mp3", text: "Office move next month.", from: 66, sceneEnd: 150 },
    ...shared,
    s6: { file: "vo-network-s6.mp3", text: "Network, sorted.", from: 572, sceneEnd: 630 },
  },
  copilot: {
    s2: { file: "vo-copilot-s2.mp3", text: "Sales wants AI.", from: 66, sceneEnd: 150 },
    ...shared,
    s6: { file: "vo-copilot-s6.mp3", text: "Copilot, sorted.", from: 572, sceneEnd: 630 },
  },
} satisfies Record<string, VoSet>;

export type VoSetId = keyof typeof VO_SETS;
