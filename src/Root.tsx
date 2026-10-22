import { Composition } from "remotion";
import { AlertPromo } from "./AlertPromo";
import { VideoSpec } from "./spec";
import { FPS, TOTAL_FRAMES } from "./timing";
import sample from "../data/specs/data-quality-article.json";
import { LAPTOPS_SORTED, LaptopsSorted } from "./videos/LaptopsSorted";
import { MEETINGS_SORTED, MeetingsSorted } from "./videos/MeetingsSorted";
import { DATA_SORTED, DATA_SORTED_4X5, DataSorted } from "./videos/DataSorted";
import { TECH_UPDATES_WIN11, TECH_UPDATES_WIN11_4X5, TechUpdatesWindows11 } from "./videos/TechUpdatesWindows11";

const FORMATS = [
  { id: "AlertPromo-16x9", width: 1920, height: 1080 },
  { id: "AlertPromo-4x5", width: 1080, height: 1350 },
  { id: "AlertPromo-9x16", width: 1080, height: 1920 },
] as const;

// Studio previews the sample spec; renders pass a real one with --props.
export const RemotionRoot: React.FC = () => (
  <>
    {FORMATS.map((f) => (
      <Composition
        key={f.id}
        id={f.id}
        component={AlertPromo}
        schema={VideoSpec}
        defaultProps={VideoSpec.parse(sample)}
        durationInFrames={TOTAL_FRAMES}
        fps={FPS}
        width={f.width}
        height={f.height}
      />
    ))}
    {/* One-off videos with fixed copy */}
    <Composition id="LaptopsSorted-9x16" component={LaptopsSorted} {...LAPTOPS_SORTED} />
    <Composition id="TechUpdates-Windows11-9x16" component={TechUpdatesWindows11} {...TECH_UPDATES_WIN11} />
    <Composition id="MeetingsSorted-9x16" component={MeetingsSorted} {...MEETINGS_SORTED} />
    <Composition id="DataSorted-9x16" component={DataSorted} {...DATA_SORTED} />
    <Composition id="DataSorted-4x5" component={DataSorted} {...DATA_SORTED_4X5} />
    <Composition id="TechUpdates-Windows11-4x5" component={TechUpdatesWindows11} {...TECH_UPDATES_WIN11_4X5} />
  </>
);
