import { Interrupted, type TerminalApi } from "../term/types.ts";
import { factionSheet } from "./faction-sheet.ts";
import { lunaAtTheCore, toParts, type SceneCell, type ScenePiece } from "./scenes.ts";

const SVG = "http://www.w3.org/2000/svg";

// The frame has the size of the faction sheet, in sheet pixels. Every position below uses these units.
const W = 1200;
const H = 816;

// The galaxy is 64 x 26 characters of 0.6em x 1.2em, so it is 38.4em wide and 31.2em high. Its height fills the frame.
const EM = H / 31.2;
const GALAXY_X = (W - 38.4 * EM) / 2;

// Luna sits at rows 11-12, columns 30-40 of the galaxy (see lunaAtTheCore).
const TARGET_W = 210;
const TARGET_H = (TARGET_W * H) / W;
const TARGET_X = GALAXY_X + 35 * 0.6 * EM - TARGET_W / 2;
const TARGET_Y = 12 * 1.2 * EM - TARGET_H / 2;

const FPS = 20;
const PHASES = { galaxy: 2.2, draw: 0.6, blink: 0.45, lines: 0.4, zoom: 1.2 };
const END = Object.values(PHASES).reduce((a, b) => a + b);
const AT = {
  draw: PHASES.galaxy,
  blink: PHASES.galaxy + PHASES.draw,
  lines: PHASES.galaxy + PHASES.draw + PHASES.blink,
  zoom: END - PHASES.zoom,
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const ease = (v: number) => v * v * (3 - 2 * v);
const progress = (t: number, start: number, length: number) => ease(clamp((t - start) / length));
const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
const pct = (v: number, of: number) => `${(v / of) * 100}%`;

function svg(tag: string, attrs: Record<string, string | number>): SVGElement {
  const node = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function renderGalaxy(pre: HTMLElement, grid: SceneCell[][]): void {
  pre.replaceChildren(
    ...toParts(grid).map(({ text, cls }) => {
      const span = document.createElement("span");
      span.textContent = text;
      if (cls) span.className = cls;
      return span;
    }),
  );
}

// The galaxy turns, an amber box draws itself around Luna, lines reach out to the frame corners,
// and the box grows to fill the frame while the view zooms in, until only her faction sheet is left.
export async function zoomToFactionSheet(term: TerminalApi): Promise<void> {
  const piece: ScenePiece = await import("ascii.rest/pieces/galaxy");
  const frame = piece.default();
  const sheet = factionSheet();
  const ready = sheet.decode().catch(() => undefined);

  const box = document.createElement("div");
  box.className = "zoom";
  const world = document.createElement("div");
  world.className = "zoom-world";
  const pre = document.createElement("pre");
  pre.className = "zoom-galaxy blue";
  pre.style.left = pct(GALAXY_X, W);
  world.append(pre);

  const overlay = svg("svg", { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: "none", class: "zoom-frame" });
  const rect = svg("rect", { pathLength: 1 });
  const lines = [0, 1, 2, 3].map(() => svg("line", {}));
  overlay.append(rect, ...lines);
  box.append(world, sheet, overlay);
  term.printNode(box);
  term.holdView();

  const corners = (x: number, y: number, w: number, h: number) => [
    [x, y, 0, 0],
    [x + w, y, W, 0],
    [x + w, y + h, W, H],
    [x, y + h, 0, H],
  ] as const;

  const render = (t: number) => {
    const z = progress(t, AT.zoom, PHASES.zoom);
    const x = lerp(TARGET_X, 0, z);
    const y = lerp(TARGET_Y, 0, z);
    const w = lerp(TARGET_W, W, z);
    const h = lerp(TARGET_H, H, z);

    // The galaxy scales with the box, so whatever was inside the target box ends up filling the frame.
    const scale = w / TARGET_W;
    world.style.transform = `translate(${pct(x - TARGET_X * scale, W)}, ${pct(y - TARGET_Y * scale, H)}) scale(${scale})`;
    world.style.opacity = String(1 - clamp((t - AT.zoom) / (PHASES.zoom * 0.7)));

    sheet.style.left = pct(x, W);
    sheet.style.top = pct(y, H);
    sheet.style.width = pct(w, W);
    sheet.style.height = pct(h, H);
    sheet.style.opacity = String(clamp((t - AT.zoom) / (PHASES.zoom * 0.5)));

    const drawn = progress(t, AT.draw, PHASES.draw);
    const blinkOff = t > AT.blink && t < AT.lines && Math.floor((t - AT.blink) * 8) % 2 === 1;
    const fade = 1 - clamp((t - END + 0.3) / 0.3);
    for (const [k, v] of Object.entries({ x, y, width: w, height: h })) rect.setAttribute(k, String(v));
    rect.setAttribute("stroke-dashoffset", String(1 - drawn));
    rect.style.opacity = String(drawn > 0 && !blinkOff ? fade : 0);

    const reach = progress(t, AT.lines, PHASES.lines);
    corners(x, y, w, h).forEach(([x1, y1, x2, y2], i) => {
      const line = lines[i];
      if (!line) return;
      line.setAttribute("x1", String(x1));
      line.setAttribute("y1", String(y1));
      line.setAttribute("x2", String(lerp(x1, x2, reach)));
      line.setAttribute("y2", String(lerp(y1, y2, reach)));
      line.style.opacity = String(reach > 0 ? fade : 0);
    });
  };

  const still = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  try {
    for (let t = still ? END : 0; t < END; t += 1 / FPS) {
      if (t < AT.zoom + PHASES.zoom * 0.7) {
        const grid = frame(t).split("\n").map((line) => [...line].map((ch): SceneCell => ({ ch })));
        lunaAtTheCore(grid, t);
        renderGalaxy(pre, grid);
      }
      if (t >= AT.zoom) await ready;
      render(t);
      await term.sleep(1000 / FPS);
    }
  } catch (err) {
    if (!(err instanceof Interrupted)) throw err;
    render(END);
    throw err;
  }
  render(END);
  term.print(`scene: ${piece.meta.name}, by bas3line (ascii.rest, MIT)`, "dim");
}
