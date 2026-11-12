import { measureText } from "@remotion/layout-utils";
import { F } from "../../ui/theme";
import type { TheDotProps } from "./schema";

// Every position in "The Dot", worked out once per render from the frame size and the props.
// Text is measured with measureText (fonts must be loaded first; TheDot.tsx waits for them).
// Layout switches on aspect ratio: 16x9 lays the routing map left -> right, 9x16 top -> bottom.

// DM Sans vertical metrics (units per em 1000): ascent 992, descent 310, cap height 700.
export const METRICS = { ascent: 0.992, descent: 0.31, cap: 0.7 };
// Distance from the top of a line box to the baseline, for a given line-height.
export const baselineIn = (fontSize: number, lineHeight: number) =>
  ((lineHeight - METRICS.ascent - METRICS.descent) / 2 + METRICS.ascent) * fontSize;

export const HEADLINE_LH = 0.92;
export const HEADLINE_LS = "-0.02em";
export const LABEL_LS = "0.14em";

type Pt = { x: number; y: number };
export type Box = { cx: number; cy: number; w: number; h: number };

const measure = (text: string, fontSize: number, fontWeight: number, letterSpacing?: string) =>
  measureText({ text, fontFamily: F.sans, fontSize, fontWeight, letterSpacing }).width;

// Greedy word wrap at a fixed size.
const wrap = (text: string, fontSize: number, weight: number, maxW: number, ls?: string): string[] => {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && measure(next, fontSize, weight, ls) > maxW) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
};

export const buildGeometry = (W: number, H: number, p: TheDotProps) => {
  const portrait = H > W;
  const u = Math.min(W, H) / 100;
  const safeY = portrait ? 250 : 0; // platform UI safe zone, 9x16 only
  const margin = 6.5 * u;
  const cx = W / 2;
  const cy = H / 2;

  // ---- S1/S2: request line, typed by the cursor dot ----
  const fsReq = (portrait ? 6.4 : 6) * u;
  const dotC = fsReq * 0.34; // cursor dot diameter
  const typeGap = fsReq * 0.12;
  const reqW = measure(p.requestLine, fsReq, 400);
  const reqLeft = cx - (reqW + typeGap + dotC) / 2;
  const reqBaseline = cy + (METRICS.cap * fsReq) / 2;
  const reqTop = reqBaseline - baselineIn(fsReq, 1);
  // Dot centre after n typed characters.
  const typedDot = (n: number): Pt => ({
    x: reqLeft + (n > 0 ? measure(p.requestLine.slice(0, n), fsReq, 400) + typeGap : 0) + dotC / 2,
    y: reqBaseline - dotC / 2,
  });
  // Word centres: each card is born where a word of the line was.
  const words = p.requestLine.split(" ");
  const wordCentres: number[] = [];
  {
    let x = reqLeft;
    for (const w of words) {
      const ww = measure(w, fsReq, 400);
      wordCentres.push(x + ww / 2);
      x += ww + measure(" ", fsReq, 400);
    }
  }

  // ---- S3/S4: cards, hub, destinations ----
  const fsCard = (portrait ? 3.8 : 3.3) * u;
  const cardPadX = fsCard * 0.85;
  const cardH = fsCard * 2.15;
  const cardGap = (portrait ? 1.8 : 2.4) * u;
  const cardW = p.cards.map((c) => measure(c, fsCard, 400) + cardPadX * 2);
  const destW = p.destinations.map((d) => measure(d, fsCard, 400));
  const n = p.cards.length;
  const stackH = n * cardH + (n - 1) * cardGap;
  const hub: Pt = { x: cx, y: cy };
  const reach = portrait ? 16 * u : 24 * u; // hub to the near edge of the columns
  // 9x16: stagger the columns sideways so the routing lines fan out instead of overlapping.
  const fan = (i: number) => (portrait ? (i - (n - 1) / 2) * 8 * u : 0);

  // Slot i: where card i sits on the routing map (input side).
  const cardSlot: Box[] = p.cards.map((_, i) =>
    portrait
      ? { cx: cx - fan(i), cy: cy - reach - stackH + cardH / 2 + i * (cardH + cardGap), w: cardW[i], h: cardH }
      : { cx: cx - reach - cardW[i] / 2, cy: cy - stackH / 2 + cardH / 2 + i * (cardH + cardGap), w: cardW[i], h: cardH },
  );
  // Where each card drifts to when the line breaks: further out on the input side, spread wide.
  const cardScatter: Pt[] = cardSlot.map((s, i) => {
    const k = i - (n - 1) / 2;
    return portrait
      ? { x: s.cx + (i % 2 === 0 ? -1 : 1) * 9 * u, y: s.cy - 6 * u + k * 2.2 * u }
      : { x: s.cx - (i % 2 === 0 ? 9 : 4) * u, y: cy + k * (cardH + cardGap) * 1.55 };
  });
  // Card point a hairline attaches to (the edge facing the hub).
  const cardAnchor = (c: Pt, w: number): Pt =>
    portrait ? { x: c.x, y: c.y + cardH / 2 } : { x: c.x + w / 2, y: c.y };

  const monoH = (portrait ? 12 : 11) * u; // a! hub height
  const dotHub = monoH * 1.25; // dot diameter just before it becomes the monogram
  const hubR = monoH * 0.78; // hairlines start this far from the hub centre

  // Destination labels (opposite side). `anchor` is where the routing line ends.
  const destText: { left: number; baseline: number; anchor: Pt; centre: Pt }[] = p.destinations.map((_, i) => {
    if (portrait) {
      const top = cy + reach + i * (cardH + cardGap);
      const centre = { x: cx + fan(i), y: top + cardH / 2 };
      return {
        left: centre.x - destW[i] / 2,
        baseline: centre.y + (METRICS.cap * fsCard) / 2,
        anchor: { x: centre.x, y: top + cardH * 0.1 },
        centre,
      };
    }
    const y = cy - stackH / 2 + cardH / 2 + i * (cardH + cardGap);
    const left = cx + reach;
    return { left, baseline: y + (METRICS.cap * fsCard) / 2, anchor: { x: left - 1.2 * u, y }, centre: { x: left + destW[i] / 2, y } };
  });
  // Hairline from the hub edge towards a point.
  const fromHub = (to: Pt, r = hubR): Pt => {
    const dx = to.x - hub.x;
    const dy = to.y - hub.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: hub.x + (dx / len) * r, y: hub.y + (dy / len) * r };
  };

  // ---- S5: steps ----
  const fsStep = (portrait ? 5.6 : 4.2) * u;
  const stepWBold = p.steps.map((s) => measure(s, fsStep, 700));
  const ns = p.steps.length;
  const stepSpacing = portrait ? 14 * u : W * 0.175;
  const stepCol = portrait ? W * 0.34 : 0; // left edge of the vertical column
  const steps = p.steps.map((_, i) => {
    const k = i - (ns - 1) / 2;
    if (portrait) {
      const baseline = cy + k * stepSpacing + (METRICS.cap * fsStep) / 2;
      return { left: stepCol, baseline, align: "left" as const, cx: stepCol + stepWBold[i] / 2 };
    }
    const scx = cx + k * stepSpacing;
    return { left: scx, baseline: cy + (METRICS.cap * fsStep) / 2, align: "center" as const, cx: scx };
  });
  // The dot sits above the step (16x9) or to its left (9x16).
  const stepDot = (i: number): Pt =>
    portrait
      ? { x: stepCol - 4.5 * u, y: steps[i].baseline - (METRICS.cap * fsStep) / 2 }
      : { x: steps[i].cx, y: steps[i].baseline - METRICS.cap * fsStep - 3.2 * u };
  const hopArc: Pt = portrait ? { x: -5 * u, y: 0 } : { x: 0, y: -6 * u };
  // Arrows between steps.
  const arrows = p.steps.slice(0, -1).map((_, i) => {
    if (portrait) {
      const x = stepCol + 1.2 * u;
      return { from: { x, y: steps[i].baseline + 2.6 * u }, to: { x, y: steps[i + 1].baseline - METRICS.cap * fsStep - 2.6 * u } };
    }
    const y = steps[i].baseline - (METRICS.cap * fsStep) / 2;
    return { from: { x: steps[i].cx + stepWBold[i] / 2 + 2.4 * u, y }, to: { x: steps[i + 1].cx - stepWBold[i + 1] / 2 - 2.4 * u, y } };
  });
  const fsBadge = (portrait ? 2.6 : 2.1) * u;
  const badge = { left: margin, bottom: H - Math.max(safeY, margin), fs: fsBadge };

  // ---- S6: headline with the dot as its full stop ----
  const headline = p.headline.toUpperCase();
  const headLines = portrait ? splitAfterComma(headline) : [headline];
  const w100 = Math.max(...headLines.map((l) => measure(l, 100, 700, HEADLINE_LS)));
  const STOP_GAP = 0.05; // space before the full stop, in em
  const STOP_D = 0.19 * METRICS.cap; // full stop diameter, in em (~19% of cap height)
  const fsHead = (0.85 * W) / (w100 / 100 + STOP_GAP + STOP_D); // text + stop fill ~85% of the width
  const headLeft = (W - 0.85 * W) / 2;
  // Centre the caps (first cap top to last baseline) on the frame.
  const firstBaseline = cy + (METRICS.cap * fsHead) / 2 - ((headLines.length - 1) * HEADLINE_LH * fsHead) / 2;
  const headTop = firstBaseline - baselineIn(fsHead, HEADLINE_LH);
  const headBaselines = headLines.map((_, j) => firstBaseline + j * HEADLINE_LH * fsHead);
  const lastHeadW = measure(headLines[headLines.length - 1], fsHead, 700, HEADLINE_LS);
  const dotLand = STOP_D * fsHead;
  const landAt: Pt = {
    x: headLeft + lastHeadW + STOP_GAP * fsHead + dotLand / 2,
    y: headBaselines[headBaselines.length - 1] - dotLand / 2,
  };

  // ---- S7: end card ----
  const fsBrand = (portrait ? 7.6 : 6.4) * u;
  const brandLines = wrap(p.brandLine, fsBrand, 700, W - margin * 2 - fsBrand * 0.3, HEADLINE_LS);
  const brandLH = 1.0;
  const brandBlockH = brandLines.length * brandLH * fsBrand;
  const brandTop = cy - brandBlockH / 2 - (portrait ? 2 : 4) * u;
  const brandBaselines = brandLines.map((_, j) => brandTop + j * brandLH * fsBrand + baselineIn(fsBrand, brandLH));
  const dotBrand = STOP_D * fsBrand;
  const lastBrandW = measure(brandLines[brandLines.length - 1], fsBrand, 700, HEADLINE_LS);
  const brandStop: Pt = {
    x: margin + lastBrandW + STOP_GAP * fsBrand + dotBrand / 2,
    y: brandBaselines[brandBaselines.length - 1] - dotBrand / 2,
  };
  const fsCta = (portrait ? 2.7 : 2.2) * u;
  const ctaTop = brandBaselines[brandBaselines.length - 1] + 5 * u;
  const wordmark = { left: margin, top: Math.max(safeY, margin), width: 14 * u };

  return {
    W, H, u, portrait, safeY, margin, cx, cy,
    fsReq, dotC, reqLeft, reqTop, reqBaseline, reqW, typedDot, wordCentres,
    fsCard, cardPadX, cardH, cardW, cardSlot, cardScatter, cardAnchor,
    hub, monoH, dotHub, hubR, destText, fromHub,
    fsStep, steps, stepDot, hopArc, arrows, badge,
    headLines, fsHead, headLeft, headTop, headBaselines, dotLand, landAt,
    fsBrand, brandLines, brandLH, brandTop, brandBaselines, dotBrand, brandStop, fsCta, ctaTop, wordmark,
  };
};

export type Geometry = ReturnType<typeof buildGeometry>;

// "NEW TEAM, SORTED" -> ["NEW TEAM,", "SORTED"]; no comma -> break at the middle space.
function splitAfterComma(text: string): string[] {
  const i = text.indexOf(", ");
  if (i > 0) return [text.slice(0, i + 1), text.slice(i + 2)];
  const words = text.split(" ");
  if (words.length < 2) return [text];
  const mid = Math.ceil(words.length / 2);
  return [words.slice(0, mid).join(" "), words.slice(mid).join(" ")];
}
