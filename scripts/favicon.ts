// Draws the favicon from Luna's face in the LunaGPT mascot: an SVG, a 32 px PNG, and a 180 px icon for phones.
import { join } from "node:path";
import { CLASS, FACE } from "../src/lunagpt/mascot.ts";
import { encodeIndexedPng, type Rgb } from "./lib/png.ts";

// index.html links these files, so the bundler copies them into dist/ with a hash in the name.
const OUT = join(import.meta.dir, "..", "src", "favicon");
const BACKGROUND = "#0b0e14";

// The colours of the mascot classes in src/style.css, with the eyes open.
const FILL: Record<string, string> = {
  "px-fur": "#8f98a8",
  "px-ear": "#4f5b73",
  "px-eye": "#f0a63a",
  "px-eye-low": "#f0a63a",
  "px-pupil": "#1c2230",
  "px-nose": "#d98c8c",
  "px-whisker": "#c9d1dc",
};

const hex = (s: string): Rgb => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
const width = FACE[0]?.length ?? 0;
const height = FACE.length;
const colorAt = (x: number, y: number): string | undefined => {
  const cls = CLASS[FACE[y]?.[x] ?? "."];
  return cls ? FILL[cls] : undefined;
};

// The face is wider than tall, so it sits in the middle of a square.
const side = width;
const top = Math.floor((side - height) / 2);
const rects: string[] = [];
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const fill = colorAt(x, y);
    if (fill) rects.push(`<rect x="${x}" y="${y + top}" width="1" height="1" fill="${fill}"/>`);
  }
}
await Bun.write(
  join(OUT, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">${rects.join("")}</svg>\n`,
);

// A square PNG of `size` pixels: the face scaled up by whole pixels and centred, on a transparent or solid ground.
function png(size: number, ground?: string): Uint8Array {
  const palette: Rgb[] = [hex(ground ?? "#000000"), ...Object.values(FILL).map(hex)];
  const index = new Map(Object.values(FILL).map((c, i) => [c, i + 1]));
  const scale = Math.floor((size * 0.9) / width);
  const left = Math.floor((size - width * scale) / 2);
  const down = Math.floor((size - height * scale) / 2);
  const pixels = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fill = colorAt(Math.floor((x - left) / scale), Math.floor((y - down) / scale));
      const inside = x >= left && y >= down && x < left + width * scale && y < down + height * scale;
      pixels[y * size + x] = inside && fill ? (index.get(fill) ?? 0) : 0;
    }
  }
  return encodeIndexedPng(size, size, palette, pixels, ground ? undefined : 0);
}

await Bun.write(join(OUT, "favicon.png"), png(32));
await Bun.write(join(OUT, "apple-touch-icon.png"), png(180, BACKGROUND));
console.log("src/favicon/favicon.svg, favicon.png, apple-touch-icon.png");
