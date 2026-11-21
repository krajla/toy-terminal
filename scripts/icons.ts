// Draws the small pixel icons for `roll` and the prompt as indexed PNGs in public/icons/.
// Each icon is a grid of characters: "." is transparent, every other character is a colour from its palette.
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { encodeIndexedPng, type Rgb } from "./lib/png.ts";

const ROOT = join(import.meta.dir, "..");

const hex = (s: string): Rgb => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];

interface Icon {
  colors: Record<string, string>;
  rows: string[];
}

export const ICONS: Record<string, Icon> = {
  heart: {
    colors: { r: "#c8323c", d: "#7a1a24", h: "#f08088", a: "#d8545c", v: "#5a6fa6" },
    rows: [
      "......vv..aa....",
      ".....v..vaaaa...",
      "....v...aa..aa..",
      "..dd..rraa...a..",
      ".drrdrrrrr...a..",
      "drhhrrrrrrr.a...",
      "rhhrrrrrdrrrr...",
      "rhrrrrrrdrrrrr..",
      "rrrrrrrdrrrrrrd.",
      ".rrrrrrdrrrrrrd.",
      ".rrrrrrrdrrrrdd.",
      "..rrrrrrrdrrrd..",
      "...drrrrrrdrd...",
      "....ddrrrrrd....",
      "......dddrd.....",
      "........dd......",
    ],
  },
  delta: {
    colors: { g: "#5fae4f", d: "#2f6a2a" },
    rows: [
      ".......gg.......",
      "......gggg......",
      "......gggg......",
      ".....gggggg.....",
      ".....ggddgg.....",
      "....ggd..dgg....",
      "....ggd..dgg....",
      "...ggd....dgg...",
      "...ggd....dgg...",
      "..ggd......dgg..",
      "..ggddddddddgg..",
      ".gggggggggggggg.",
      ".gggggggggggggg.",
    ],
  },
  dagger: {
    colors: { w: "#f4f0e8", s: "#aab4c5", o: "#d8742a", b: "#7a4a22", p: "#e8c547" },
    rows: [
      "..............ww",
      ".............wsw",
      "............wsw.",
      "...........wsw..",
      "..........wsw...",
      ".........wsw....",
      "........wsw.....",
      "..o....wsw......",
      "...o..wsw.......",
      "....owsw........",
      ".....oo.........",
      "....b.oo........",
      "...b...o........",
      "..b.............",
      ".b..............",
      "p...............",
    ],
  },
  // A derpy dragon in place of the trademarked D&D ampersand: googly eyes that look two ways, tongue out.
  dragon: {
    colors: { r: "#c8323c", d: "#7a1a24", w: "#f4f0e8", k: "#0b0e14", y: "#e8c547", p: "#f08088" },
    rows: [
      ".dwwwd.dwwkd....",
      ".dwwwd.dwwwd....",
      ".dkwwd.dwwwd....",
      "..rrrrrrrrr..d..",
      ".rrrrrrrrrrr.dd.",
      "rrrrrrrrrrrr.ddd",
      "rdrrrrrrrrrr.ddd",
      "rrrrrrrrrrrr..dd",
      ".pprrrrrrrrr....",
      ".p...ryyyyrrr...",
      ".....ryyyyyrr.r.",
      ".....ryyyyrr..r.",
      "......rr.rr..rr.",
      ".....dd..dd.rr..",
    ],
  },
  "yellow-sign": {
    colors: { y: "#e8c547", o: "#9c7a1c" },
    rows: [
      "....y.......",
      "...yy.......",
      "...y.y......",
      "..y..y......",
      "..y...y.....",
      ".y..y.y..y..",
      ".y..yy.y.y..",
      ".yy.y.yyy...",
      "...yy..yy...",
      "..y.y...yy..",
      "yyyy....yy..",
      ".y..yyyyy.y.",
      ".y.......y..",
      "y.........y.",
    ],
  },
};

export async function writeIcons(): Promise<void> {
  const outDir = join(ROOT, "public", "icons");
  await mkdir(outDir, { recursive: true });
  for (const [name, icon] of Object.entries(ICONS)) {
    const keys = Object.keys(icon.colors);
    const palette: Rgb[] = [[0, 0, 0], ...keys.map((k) => hex(icon.colors[k] ?? "#ff00ff"))];
    const width = Math.max(...icon.rows.map((r) => r.length));
    const height = icon.rows.length;
    const indices = new Uint8Array(width * height);
    icon.rows.forEach((row, y) => [...row].forEach((ch, x) => (indices[y * width + x] = ch === "." ? 0 : keys.indexOf(ch) + 1)));
    await Bun.write(join(outDir, `${name}.png`), encodeIndexedPng(width, height, palette, indices, 0));
    console.log(`public/icons/${name}.png  ${width}x${height}`);
  }
}

if (import.meta.main) await writeIcons();
