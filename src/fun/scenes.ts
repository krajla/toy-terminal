import lunaFace from "./luna-face.txt" with { type: "text" };
import type { TerminalApi } from "../term/types.ts";

export interface ScenePiece {
  meta: { name: string; cols: number; rows: number; fps: number; cell?: 1 | 2; palette?: readonly string[]; ground?: string };
  default(): (t: number, env?: { color?: Uint8Array }) => string;
}

/** A cell is a character, and optionally a class that colours it. */
export interface SceneCell {
  ch: string;
  cls?: string;
}

export type Overlay = (grid: SceneCell[][], t: number) => void;

export interface SceneOptions {
  seconds: number;
  cls?: string;
  overlay?: Overlay;
}

// Overlay classes on a canvas. Keep in step with the same classes in style.css.
const CLASS_COLORS: Record<string, string> = { amber: "#f0a63a", ibad: "#3d8bff", fur: "#b4bcc8" };
const DOT_RADIUS: Record<string, number> = { "·": 0.22, "•": 0.36, "●": 0.5 };
const CELL_PX = 4;

interface CanvasScene {
  ctx: CanvasRenderingContext2D;
  palette: readonly string[];
  ground: string;
  cellH: number;
}

function canvasScene(term: TerminalApi, piece: ScenePiece): CanvasScene | undefined {
  const { palette, cols, rows, cell } = piece.meta;
  if (!palette) return undefined;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext?.("2d");
  if (!ctx) return undefined;
  const cellH = CELL_PX * (cell === 1 ? 1 : 2);
  canvas.width = cols * CELL_PX;
  canvas.height = rows * cellH;
  canvas.className = "scene-canvas";
  term.printNode(canvas);
  return { ctx, palette, ground: piece.meta.ground ?? "#000", cellH };
}

// Draws each cell as a dot sized by its glyph, in its palette colour or its overlay class colour.
function drawDots(scene: CanvasScene, grid: SceneCell[][], color: Uint8Array): void {
  const { ctx, palette, ground, cellH } = scene;
  ctx.fillStyle = ground;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  const paths = new Map<string, Path2D>();
  grid.forEach((row, r) => {
    row.forEach(({ ch, cls }, c) => {
      const radius = DOT_RADIUS[ch];
      if (!radius) return;
      const fill = (cls && CLASS_COLORS[cls]) || palette[color[r * row.length + c] ?? 0] || "#fff";
      let path = paths.get(fill);
      if (!path) paths.set(fill, (path = new Path2D()));
      const x = (c + 0.5) * CELL_PX;
      const y = (r + 0.5) * cellH;
      path.moveTo(x + radius * CELL_PX, y);
      path.arc(x, y, radius * CELL_PX, 0, Math.PI * 2);
    });
  });
  for (const [fill, path] of paths) {
    ctx.fillStyle = fill;
    ctx.fill(path);
  }
}

export async function playScene(term: TerminalApi, load: () => Promise<ScenePiece>, opts: SceneOptions): Promise<void> {
  const piece = await load();
  const frame = piece.default();
  const canvas = canvasScene(term, piece);
  const screen = canvas ? undefined : term.scene(piece.meta.cols, piece.meta.cell === 1);
  const color = new Uint8Array(piece.meta.cols * piece.meta.rows);
  const step = 1 / piece.meta.fps;
  try {
    for (let t = 0; t < opts.seconds; t += step) {
      const text = frame(t, canvas ? { color } : undefined);
      const grid = text.split("\n").map((line) => [...line].map((ch): SceneCell => ({ ch })));
      opts.overlay?.(grid, t);
      if (canvas) drawDots(canvas, grid, color);
      else if (opts.overlay) screen?.setParts(toParts(grid), opts.cls);
      else screen?.set(text, opts.cls);
      await term.sleep(step * 1000);
    }
  } finally {
    term.print(`scene: ${piece.meta.name}, by bas3line (ascii.rest, MIT)`, "dim");
  }
}

// Merges runs of cells with the same class, so a frame becomes a few text nodes and spans, not one per cell.
function toParts(grid: SceneCell[][]): { text: string; cls?: string }[] {
  const parts: { text: string; cls?: string }[] = [];
  grid.forEach((row, r) => {
    for (const cell of r ? [{ ch: "\n" }, ...row] : row) {
      const last = parts.at(-1);
      if (last && last.cls === cell.cls) last.text += cell.ch;
      else parts.push({ text: cell.ch, cls: cell.cls });
    }
  });
  return parts;
}

function put(grid: SceneCell[][], row: number, col: number, text: string, cls?: string): void {
  const line = grid[row];
  if (!line) return;
  [...text].forEach((ch, i) => {
    if (col + i >= 0 && col + i < line.length) line[col + i] = { ch, cls };
  });
}

// Luna asleep in the galaxy's bright core, where Mecatol Rex sits on a Twilight Imperium map.
export const lunaAtTheCore: Overlay = (grid, t) => {
  put(grid, 12, 30, " =^.^= ", "amber");
  put(grid, 11, 36, Math.floor(t * 2) % 2 ? " z  " : " zZ ", "amber");
};

const clamp = (v: number) => Math.min(1, Math.max(0, v));
const smooth = (a: number, b: number, v: number) => {
  const k = clamp((v - a) / (b - a));
  return k * k * (3 - 2 * k);
};

// The desert-night piece is 200x100 square cells with the horizon at row 64. Luna's face (from scripts/face-art.ts)
// surfaces in the open dunes left of the acacia, on a ringed sandworm body, with sand spraying around the base.
const FACE = lunaFace.trimEnd().split("\n");
const FACE_W = Math.max(...FACE.map((l) => l.length));
const WORM_X = 88;
const WORM_BASE = 78;

const REAR = 26;
const RING = 4;

// One ringed column rising straight out of the sand, Luna's face on top. Head and body move as one piece.
export const sandworm: Overlay = (grid, t) => {
  const rise = smooth(0.8, 4, t);
  if (rise <= 0) return;
  const top = Math.round(WORM_BASE - rise * (FACE.length + REAR));

  for (let row = top + FACE.length - 2; row < WORM_BASE; row++) {
    const depth = row - top - FACE.length;
    const half = FACE_W / 2 - 3 + Math.max(0, depth) * 0.12;
    const ring = depth >= 0 && depth % RING === 0;
    for (let col = Math.round(WORM_X + FACE_W / 2 - half); col < WORM_X + FACE_W / 2 + half; col++) {
      const edge = Math.abs(col + 0.5 - WORM_X - FACE_W / 2) > half - 2;
      put(grid, row, col, ring ? (edge ? " " : "·") : edge ? "•" : "●", "fur");
    }
  }

  FACE.forEach((line, i) => {
    const row = top + i;
    if (row >= WORM_BASE) return;
    [...line].forEach((ch, x) => {
      if (ch === "O" || ch === "o") put(grid, row, WORM_X + x, ch === "O" ? "●" : "•", "ibad");
      else if (ch !== " ") put(grid, row, WORM_X + x, ch === "." ? " " : ch, "fur");
    });
  });

  for (let k = 0; rise < 1 && k < 60; k++) {
    const col = Math.round(WORM_X + FACE_W / 2 + Math.sin(k * 12.9898 + t * 7) * 26);
    const row = Math.round(WORM_BASE - 1 - (Math.sin(k * 78.233 + t * 5) * 0.5 + 0.5) * 9 * (1 - rise));
    put(grid, row, col, k % 3 ? "·" : "•");
  }
};
