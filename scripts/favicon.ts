// Draws the favicon from Luna's face in the Dune scene (src/fun/luna-face.txt): an SVG, a 32 px PNG, and a 180 px
// icon for phones. Each character is one pixel. Bigger dots are lighter fur. The eyes are dark, as in the photo.
import { join } from "node:path";
import { encodeIndexedPng, type Rgb } from "./lib/png.ts";

// index.html links these files, so the bundler copies them into dist/ with a hash in the name.
const OUT = join(import.meta.dir, "..", "src", "favicon");
const BACKGROUND = "#0b0e14";

const FILL: Record<string, string> = {
  "●": "#c9d1dc",
  "•": "#8f98a8",
  "·": "#5b6578",
  ".": "#3a4252",
  O: "#1c2230",
  o: "#3a4252",
};

const face = (await Bun.file(join(import.meta.dir, "..", "src", "fun", "luna-face.txt")).text()).trimEnd().split("\n");
const width = Math.max(...face.map((line) => [...line].length));
const height = face.length;
const side = Math.max(width, height);
const left = Math.floor((side - width) / 2);
const top = Math.floor((side - height) / 2);
const colorAt = (x: number, y: number): string | undefined => FILL[[...(face[y - top] ?? "")][x - left] ?? " "];

const hex = (s: string): Rgb => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

const rects: string[] = [];
for (let y = 0; y < side; y++) {
  for (let x = 0; x < side; x++) {
    const fill = colorAt(x, y);
    if (fill) rects.push(`<rect x="${x}" y="${y}" width="1" height="1" fill="${fill}"/>`);
  }
}
await Bun.write(
  join(OUT, "favicon.svg"),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${side} ${side}" shape-rendering="crispEdges">${rects.join("")}</svg>\n`,
);

// A square PNG of `size` pixels: the face scaled up by whole pixels and centred, on a transparent or solid ground.
function png(size: number, ground?: string): Uint8Array {
  const colors = [...new Set(Object.values(FILL))];
  const palette: Rgb[] = [hex(ground ?? "#000000"), ...colors.map(hex)];
  const index = new Map(colors.map((c, i) => [c, i + 1]));
  const scale = Math.max(1, Math.floor(size / side));
  const offset = Math.floor((size - side * scale) / 2);
  const pixels = new Uint8Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const fill = colorAt(Math.floor((x - offset) / scale), Math.floor((y - offset) / scale));
      pixels[y * size + x] = fill ? (index.get(fill) ?? 0) : 0;
    }
  }
  return encodeIndexedPng(size, size, palette, pixels, ground ? undefined : 0);
}

await Bun.write(join(OUT, "favicon.png"), png(32));
await Bun.write(join(OUT, "apple-touch-icon.png"), png(180, BACKGROUND));
console.log("src/favicon/favicon.svg, favicon.png, apple-touch-icon.png");
