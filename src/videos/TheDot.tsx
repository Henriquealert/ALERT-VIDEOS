import { getAudioDurationInSeconds } from "@remotion/media-utils";
import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  continueRender,
  delayRender,
  interpolate,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { buildKeyframes, FALL_START } from "../dot/keyframes";
import { TheDot } from "../dot/TheDot";
import { C, F } from "../ui/theme";
import { optionalAsset } from "./the-dot/assets";
import { buildGeometry } from "./the-dot/geometry";
import { S2Type, S3Break, S4Route, S5Steps, S6Headline, S7End } from "./the-dot/scenes";
import { THE_DOT_COPILOT, THE_DOT_DEFAULTS, THE_DOT_NETWORK, theDotSchema, type TheDotProps } from "./the-dot/schema";
import { DURATION, FPS, SCENES, sceneAt, T, TICK_FRAMES } from "./the-dot/timeline";
import { VO_SETS, type VoLine } from "./the-dot/vo-lines";

// "The Dot": 24 s text-led brand film. One round dot is the main character, from a blinking
// cursor to the full stop of the headline. Grounds change on hard cuts; the dot is one layer
// above every scene (src/dot/), its path in src/dot/keyframes.ts.

const GROUND = { ink: C.ink, blue: C.blue, ivory: C.ivory, lime: C.lime } as const;
const SFX_VOLUME = 0.6;
const MUSIC = { base: 0.35, ducked: 0.18, ramp: 5 };

// Wait for the brand faces before measuring any text.
const useFontsReady = () => {
  const [ready, setReady] = useState(false);
  const [handle] = useState(() => delayRender("The Dot: fonts"));
  useEffect(() => {
    Promise.all([400, 700].map((w) => document.fonts.load(`${w} 100px "${F.sans}"`)))
      .then(() => {
        setReady(true);
        continueRender(handle);
      })
      .catch((e) => {
        console.error("[The Dot] font load failed", e);
        setReady(true);
        continueRender(handle);
      });
  }, [handle]);
  return ready;
};

// Voiceover lines that exist, with their measured lengths (frames) for music ducking.
const useVoiceover = (lines: VoLine[]) => {
  const present = useMemo(
    () => lines.map((l) => ({ ...l, src: optionalAsset(`vo/${l.file}`, `voiceover ${l.file}`) })).filter((l) => l.src),
    [lines],
  );
  const [lengths, setLengths] = useState<number[] | null>(null);
  const [handle] = useState(() => delayRender("The Dot: voiceover lengths"));
  useEffect(() => {
    Promise.all(present.map((l) => getAudioDurationInSeconds(l.src as string)))
      .then((secs) => {
        const frames = secs.map((s) => Math.ceil(s * FPS));
        present.forEach((l, i) => {
          const over = l.from + frames[i] - l.sceneEnd;
          if (over > 0) console.warn(`[The Dot] ${l.file} runs ${over} frames past the end of its scene.`);
        });
        setLengths(frames);
        continueRender(handle);
      })
      .catch((e) => {
        console.error("[The Dot] could not read voiceover lengths", e);
        setLengths(present.map((l) => l.sceneEnd - l.from));
        continueRender(handle);
      });
  }, [present, handle]);
  return present.map((l, i) => ({ ...l, src: l.src as string, frames: lengths?.[i] ?? 0 }));
};

const Soundtrack: React.FC<{ voSet: TheDotProps["voSet"] }> = ({ voSet }) => {
  const vo = useVoiceover(Object.values(VO_SETS[voSet]));
  const music = optionalAsset("music/pulse.mp3", "music");
  const tick = optionalAsset("sfx/tick.wav", "cursor ticks");
  const land = optionalAsset("sfx/land.wav", "the landing thud");

  // 0.35, ducked to 0.18 under any voice line; fade in 0-30, out 690-720.
  const musicVolume = (f: number) => {
    const duck = Math.max(
      0,
      ...vo.map((l) =>
        interpolate(f, [l.from - MUSIC.ramp, l.from, l.from + l.frames, l.from + l.frames + MUSIC.ramp], [0, 1, 1, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        }),
      ),
    );
    const fade = interpolate(f, [0, 30, DURATION - 30, DURATION], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    return (MUSIC.base + (MUSIC.ducked - MUSIC.base) * duck) * fade;
  };

  return (
    <>
      {music ? <Audio src={music} volume={musicVolume} /> : null}
      {vo.map((l) => (
        <Sequence key={l.file} from={l.from} layout="none">
          <Audio src={l.src} />
        </Sequence>
      ))}
      {tick
        ? TICK_FRAMES.map((f) => (
            <Sequence key={`tick-${f}`} from={f} layout="none">
              <Audio src={tick} volume={SFX_VOLUME} />
            </Sequence>
          ))
        : null}
      {land ? (
        <Sequence from={T.s6Land} layout="none">
          <Audio src={land} volume={SFX_VOLUME} />
        </Sequence>
      ) : null}
    </>
  );
};

const Film: React.FC<TheDotProps> = (p) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const g = useMemo(() => buildGeometry(width, height, p), [width, height, p]);
  const keys = useMemo(() => buildKeyframes(g, p), [g, p]);
  const scene = sceneAt(frame);
  const sp = { g, p, frame };
  const inS = (id: keyof typeof SCENES) => scene === id;

  return (
    <AbsoluteFill style={{ background: GROUND[SCENES[scene].ground] }}>
      {inS("s2") ? <S2Type {...sp} /> : null}
      {inS("s3") ? <S3Break {...sp} /> : null}
      {inS("s4") ? <S4Route {...sp} /> : null}
      {inS("s5") ? <S5Steps {...sp} /> : null}
      {inS("s6") ? <S6Headline {...sp} /> : null}
      {inS("s7") ? <S7End {...sp} /> : null}
      <TheDot keys={keys} />
    </AbsoluteFill>
  );
};

export const TheDotFilm: React.FC<TheDotProps> = (props) => {
  const ready = useFontsReady();
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      {ready ? <Film {...props} /> : null}
      <Soundtrack voSet={props.voSet} />
    </AbsoluteFill>
  );
};

const base = { component: TheDotFilm, schema: theDotSchema, fps: FPS, durationInFrames: DURATION };
const W16 = { width: 1920, height: 1080 };
const W9 = { width: 1080, height: 1920 };

export const THE_DOT_COMPOSITIONS = [
  { id: "TheDot-16x9", ...base, ...W16, defaultProps: THE_DOT_DEFAULTS },
  { id: "TheDot-9x16", ...base, ...W9, defaultProps: THE_DOT_DEFAULTS },
  // Cut-downs. TODO: give these their own cards/destinations before rendering (see schema.ts).
  { id: "TheDot-Network-16x9", ...base, ...W16, defaultProps: THE_DOT_NETWORK },
  { id: "TheDot-Network-9x16", ...base, ...W9, defaultProps: THE_DOT_NETWORK },
  { id: "TheDot-Copilot-16x9", ...base, ...W16, defaultProps: THE_DOT_COPILOT },
  { id: "TheDot-Copilot-9x16", ...base, ...W9, defaultProps: THE_DOT_COPILOT },
];

// Exposed for checks: the fall starts here so the first contact lands on T.s6Land.
export const THE_DOT_FALL_START = FALL_START;
