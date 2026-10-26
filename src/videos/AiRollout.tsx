import { AbsoluteFill, Audio, Easing, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from "remotion";
import { LOGO_FILE, LOGO_RATIO } from "../ui/EndCard";
import { C, F } from "../ui/theme";

// "Who set up your AI?" — rolling out Microsoft 365 Copilot. LinkedIn feed, 4:5, 25 fps, 23 bars at 132 BPM (41.8 s).
// Fixed copy and edit from Henrique's brief (26 Oct 2026). Footage: the three supplied clips only, original audio muted.
// Brief style, not the Story frame: Acid Lime and Soft Ivory only, flat 3px line diagrams, hard cuts on the beat,
// no wordmark before the end card. The brief asks for Helvetica Neue Bold; the brand-fonts rule wins, so it is
// DM Sans Bold (same weight and width class, never condensed or italic).
// Music: scripts/make-ai-rollout-music.py (original, 132 BPM 2-step). SCENE_BARS and FLASH_STEPS must match it.
// Safe margins for the LinkedIn player: 64 px left/right, 80 px top, 120 px bottom.

const FPS = 25;
const BPM = 132;
const BEAT = (FPS * 60) / BPM; // 11.36 frames
const at = (beats: number) => Math.round(beats * BEAT);
// Tightened on request: short holds, builds every two beats. Scenes: 2, 3, 4, 4, 4, 3, 3 bars.
const SCENE_BARS = [0, 2, 5, 9, 13, 17, 20, 23];
// The flash jumps on the kick and snare hits of a scene's first bar (16ths 0, 4, 10, 12): top, bottom, top, bottom.
const FLASH_STEPS = [0, 4, 10, 12];

export const AI_ROLLOUT_4X5 = { fps: FPS, durationInFrames: at(23 * 4), width: 1080, height: 1350 } as const;

// Music + voiceover (ElevenLabs "Jerry B."), placed and mixed by scripts/mix-ai-rollout-voiceover.py.
const MIX = "audio/Alert Global Tech - AI Rollout Mix.wav";
const CLIP = (id: number) => staticFile(`footage/Alert Global Tech - AI Rollout Clip ID${id}.mp4`);
const W = 1080;
const H = 1350;
const SIDE = 64;
const TOP = 80;
const BOTTOM = H - 120;
const GRADE_TYPE = 0.65;
const GRADE_DIAGRAM = 0.35;

// Placeholder: the brief asks for a real Copilot answer to the demo prompt. Replace with the three points
// Copilot gives on the real proposal before publishing.
const COPILOT_ANSWER = [
  "[real Copilot answer, point one]",
  "[real Copilot answer, point two]",
  "[real Copilot answer, point three]",
];

const big = (size: number, color: string): React.CSSProperties => ({
  fontFamily: F.sans,
  fontWeight: 700,
  fontSize: size,
  lineHeight: 0.92,
  letterSpacing: "-0.02em",
  textTransform: "uppercase",
  color,
  margin: 0,
});

const body = (size: number, color: string): React.CSSProperties => ({
  fontFamily: F.sans,
  fontWeight: 700,
  fontSize: size,
  lineHeight: 1.2,
  letterSpacing: "-0.01em",
  color,
});

export const AiRollout: React.FC = () => {
  const frame = useCurrentFrame();
  const scenes = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, EndCard];
  return (
    <AbsoluteFill>
      <Audio src={staticFile(MIX)} />
      {scenes.map((Scene, i) => {
        const from = at(SCENE_BARS[i] * 4);
        const to = at(SCENE_BARS[i + 1] * 4);
        return (
          <Sequence key={i} from={from} durationInFrames={to - from}>
            <Scene on={(b) => frame >= at(SCENE_BARS[i] * 4 + b)} beat={(frame - from) / BEAT} />
            {i < 6 ? <Flash on={(b) => frame >= at(SCENE_BARS[i] * 4 + b)} /> : null}
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

// `on(b)`: true from beat b of the scene (frame-exact with the music). `beat`: scene time in beats.
type SceneProps = { on: (beat: number) => boolean; beat: number };

// ---------- Footage ----------

// Crops a clip to the 4:5 frame. Horizontal clips follow the man with eased moves between keyframes
// (source seconds → left edge of an 864 px wide window in source pixels); the vertical clip is a fixed crop.
const Footage: React.FC<{
  id: 689 | 696 | 698;
  from: number;
  grade: number;
  pan?: [number, number][];
}> = ({ id, from, grade, pan }) => {
  const f = useCurrentFrame();
  const style: React.CSSProperties = { position: "absolute", filter: `brightness(${grade})` };
  if (id === 689) {
    // 1080×1920 source: drop the top 300 px so the blinds sit above the handset and only its bottom tip is cut.
    Object.assign(style, { left: 0, top: -300, width: 1080, height: 1920 });
  } else {
    const k = H / 1080; // 1.25: 864×1080 window fills 1080×1350
    const t = from + f / FPS;
    const x = pan
      ? interpolate(
          t,
          pan.map((p) => p[0]),
          pan.map((p) => p[1]),
          { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.inOut(Easing.sin) },
        )
      : 0;
    Object.assign(style, { left: -x * k, top: 0, width: 1920 * k, height: H });
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden" }}>
      <OffthreadVideo src={CLIP(id)} muted trimBefore={Math.round(from * FPS)} style={style} />
    </AbsoluteFill>
  );
};

// ---------- Shared pieces ----------

// WHO SET UP YOUR AI? — one bar, hard-jumping top / bottom on the kicks and snares, then gone.
const Flash: React.FC<{ on: (beat: number) => boolean }> = ({ on }) => {
  if (on(4)) return null;
  const hit = FLASH_STEPS.filter((s) => on(s / 4)).length - 1;
  const top = hit % 2 === 0;
  return (
    <div style={{ position: "absolute", left: SIDE, right: SIDE, ...(top ? { top: TOP } : { bottom: H - BOTTOM }) }}>
      <p style={big(130, C.lime)}>
        WHO SET UP
        <br />
        YOUR AI?
      </p>
    </div>
  );
};

// Downward arrow: thin lime line with an open head.
const Arrow: React.FC<{ h?: number }> = ({ h = 52 }) => (
  <svg width={40} height={h} style={{ display: "block", marginLeft: 36 }}>
    <path d={`M20 2 V${h - 3} M8 ${h - 15} L20 ${h - 3} L32 ${h - 15}`} stroke={C.lime} strokeWidth={3} fill="none" />
  </svg>
);

const Slot: React.FC<{ show: boolean; children: React.ReactNode }> = ({ show, children }) => (
  <div style={{ visibility: show ? "visible" : "hidden" }}>{children}</div>
);

// ---------- 1 · Bars 1–2 · the hanging phone ----------

const Scene1: React.FC<SceneProps> = () => <Footage id={689} from={0} grade={GRADE_TYPE} />;

// ---------- 2 · Bars 3–5 · NEW TOOLS. OLD HABITS. NO PLAN. ----------

const Scene2: React.FC<SceneProps> = ({ on }) => {
  const lines: [string, string][] = [
    ["NEW TOOLS.", C.lime],
    ["OLD HABITS.", C.ivory],
    ["NO PLAN.", C.lime],
  ];
  return (
    <>
      <Footage id={698} from={0} grade={GRADE_TYPE} pan={[[0, 0], [3, 110], [5.5, 30], [7.3, 0]]} />
      {on(4) ? (
        <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: H - BOTTOM }}>
          {lines.map(([t, c], i) => (
            <p key={t} style={{ ...big(110, c), visibility: on(4 + 2 * i) ? "visible" : "hidden" }}>
              {t}
            </p>
          ))}
        </div>
      ) : null}
    </>
  );
};

// ---------- 3 · Bars 6–9 · the rollout, in four moves ----------

const MOVES = [
  ["01", "ASSESS", "Licences, data and security, checked first."],
  ["02", "PILOT", "One team, real work, before anyone else."],
  ["03", "ROLL OUT", "Team by team, across your Microsoft 365."],
  ["04", "TRAIN", "Hands-on sessions, so it actually gets used."],
];

const Scene3: React.FC<SceneProps> = ({ on }) => (
  <>
    <Footage id={696} from={0} grade={GRADE_DIAGRAM} pan={[[0, 770], [2, 790], [4.5, 620], [6.5, 610], [9.1, 720]]} />
    {on(4) ? (
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: TOP }}>
        <p style={big(80, C.lime)}>
          THE ROLLOUT,
          <br />
          IN FOUR MOVES.
        </p>
        <div style={{ height: 48 }} />
        {MOVES.map(([n, name, text], i) => (
          <Slot key={n} show={on(4 + 2 * i)}>
            {i > 0 ? <Arrow /> : null}
            <div style={{ border: `3px solid ${C.lime}`, padding: "22px 28px 24px" }}>
              <div style={{ ...big(44, C.lime), display: "flex", gap: 22 }}>
                <span>{n}</span>
                <span>{name}</span>
              </div>
              <div style={{ ...body(26, C.ivory), marginTop: 12 }}>{text}</div>
            </div>
          </Slot>
        ))}
      </div>
    ) : null}
  </>
);

// ---------- 4 · Bars 10–13 · show it working (Copilot in Word demo) ----------

const PROMPT = "Summarize this proposal in three points.";
const TYPE_FROM = 6; // beats: half a bar after the title
const ANSWER_FROM = 10; // one answer line per beat from here
const CHARS_PER_16TH = 3;

const Scene4: React.FC<SceneProps> = ({ on, beat }) => {
  const steps = Math.floor((beat - TYPE_FROM) * 4 + 1e-6) + 1;
  const typed = on(TYPE_FROM) ? PROMPT.slice(0, Math.max(0, steps) * CHARS_PER_16TH) : "";
  const answering = on(ANSWER_FROM);
  return (
    <>
      <Footage id={698} from={9} grade={GRADE_DIAGRAM} pan={[[9, 0], [11, 100], [13, 200], [15.5, 300], [18.1, 280]]} />
      {on(4) ? (
        <div style={{ position: "absolute", left: SIDE, right: SIDE, top: TOP }}>
          <p style={big(100, C.lime)}>SHOW IT WORKING.</p>
          <div style={{ height: 44 }} />
          <Slot show={on(5)}>
            <div style={{ border: `3px solid ${C.ivory}`, padding: "30px 32px 36px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ width: 14, height: 14, borderRadius: "50%", background: C.lime }} />
                <div style={{ ...body(22, C.ivory), letterSpacing: "0.04em" }}>DEMO · COPILOT IN WORD</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 22, margin: "34px 0 40px" }}>
                {[100, 94, 97, 58].map((w) => (
                  <div key={w} style={{ width: `${w}%`, height: 3, background: C.ivory }} />
                ))}
              </div>
              <Slot show={on(TYPE_FROM)}>
                <div style={{ border: `3px solid ${C.lime}`, padding: "22px 24px", display: "flex", alignItems: "center" }}>
                  <span style={body(28, C.ivory)}>{typed}</span>
                  {!answering ? <span style={{ width: 3, height: 34, marginLeft: 4, background: C.lime }} /> : null}
                </div>
              </Slot>
              <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 34 }}>
                {COPILOT_ANSWER.map((a, i) => (
                  <Slot key={a} show={on(ANSWER_FROM + i)}>
                    <div style={{ display: "flex", gap: 20 }}>
                      <span style={body(28, C.lime)}>{i + 1}</span>
                      <span style={body(28, C.ivory)}>{a}</span>
                    </div>
                  </Slot>
                ))}
              </div>
            </div>
          </Slot>
        </div>
      ) : null}
    </>
  );
};

// ---------- 5 · Bars 14–17 · where it all connects ----------

const NodeBox: React.FC<{ color: string; title: string; text: string }> = ({ color, title, text }) => (
  <div style={{ border: `3px solid ${color}`, padding: "18px 24px 20px" }}>
    <div style={big(34, color)}>{title}</div>
    <div style={{ ...body(24, C.ivory), marginTop: 10 }}>{text}</div>
  </div>
);

const Scene5: React.FC<SceneProps> = ({ on }) => (
  <>
    <Footage id={689} from={7.5} grade={GRADE_DIAGRAM} />
    {on(4) ? (
      <div style={{ position: "absolute", left: SIDE, right: SIDE, top: TOP }}>
        <p style={big(78, C.lime)}>WHERE IT ALL CONNECTS.</p>
        <div style={{ height: 52 }} />
        <NodeBox color={C.ivory} title="YOUR FILES, EMAIL AND CHATS" text="SharePoint · OneDrive · Outlook · Teams" />
        <Slot show={on(6)}>
          <Arrow />
          <div style={{ border: `3px dashed ${C.lime}`, padding: "16px 22px 22px" }}>
            <div style={{ ...body(20, C.lime), letterSpacing: "0.1em", marginBottom: 14 }}>INSIDE YOUR TENANT</div>
            <NodeBox color={C.lime} title="MICROSOFT 365" text="The permissions you already set still apply." />
            <Slot show={on(8)}>
              <Arrow />
              <NodeBox color={C.lime} title="COPILOT" text="Works with what each person can already open." />
            </Slot>
          </div>
        </Slot>
        <Slot show={on(10)}>
          <Arrow />
          <NodeBox color={C.ivory} title="YOUR TEAM" text="Answers, drafts and summaries, in the apps they use." />
        </Slot>
      </div>
    ) : null}
  </>
);

// ---------- 6 · Bars 18–20 · then we train your team ----------

const Scene6: React.FC<SceneProps> = ({ on }) => (
  <>
    <Footage id={696} from={9.6} grade={GRADE_TYPE} pan={[[9.6, 710], [12, 740], [15.1, 790]]} />
    {on(4) ? (
      <div style={{ position: "absolute", left: SIDE, right: SIDE, bottom: H - BOTTOM }}>
        <p style={big(110, C.lime)}>
          THEN WE TRAIN
          <br />
          YOUR TEAM.
        </p>
        <div style={{ ...body(32, C.ivory), marginTop: 30, visibility: on(6) ? "visible" : "hidden" }}>
          In English, Spanish or Portuguese.
          <br />
          Certification through Certiport.
        </div>
      </div>
    ) : null}
  </>
);

// ---------- 7 · Bars 21–23 · end card: solid lime, type and logo knocked out to the phone ----------

const END_SIZE = 166; // largest that keeps PRACTICAL. inside the side margins
const LOGO_W = 300;

const EndCard: React.FC<SceneProps> = ({ on }) => {
  const type = (size: number): React.CSSProperties => ({ fontFamily: F.sans, fontWeight: 700, fontSize: size, letterSpacing: "-0.02em" });
  const cap = 0.7; // DM Sans cap height / em
  const top = 300;
  const step = END_SIZE * 0.92;
  return (
    <>
      <Footage id={689} from={0} grade={GRADE_TYPE} />
      <svg width={W} height={H} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <filter id="to-black">
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
          </filter>
          <mask id="knockout" maskUnits="userSpaceOnUse" x={0} y={0} width={W} height={H}>
            <rect width={W} height={H} fill="white" />
            <image href={staticFile(LOGO_FILE)} x={SIDE} y={TOP} width={LOGO_W} height={LOGO_W / LOGO_RATIO} filter="url(#to-black)" />
            {["AI,", "MADE", "PRACTICAL."].map((t, i) => (
              <text key={t} x={SIDE - 6} y={top + END_SIZE * cap + i * step} fill="black" style={type(END_SIZE)}>
                {t}
              </text>
            ))}
            {on(2) ? (
              <text x={SIDE} y={846} fill="black" style={type(36)}>
                One supplier, from licences to rollout to training.
              </text>
            ) : null}
            {on(4) ? (
              <>
                <text x={SIDE} y={1110} fill="black" style={type(56)}>
                  Talk to an Expert
                </text>
                <text x={SIDE} y={1190} fill="black" style={type(32)}>
                  sales@alertglobaltech.com
                </text>
              </>
            ) : null}
          </mask>
        </defs>
        <rect width={W} height={H} fill={C.lime} mask="url(#knockout)" />
      </svg>
    </>
  );
};
