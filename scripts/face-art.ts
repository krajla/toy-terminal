// Turns the close-up photo in images/ (gitignored) into dot text for the Uprising sandworm: src/fun/luna-face.txt.
// A space is transparent (the bright wall behind Luna), "." is a dark hole, "O" and "o" are an eye (drawn in the
// blue of the Eyes of Ibad), and "·•●" are fur.
import sharp from "sharp";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");

interface Crop {
  left: number;
  top: number;
  width: number;
  height: number;
}

async function grey(file: string, crop: Crop, cols: number, rows: number) {
  const img = sharp(join(ROOT, "images", file)).rotate().extract(crop).resize(cols, rows, { fit: "fill" });
  const { data: lum } = await img.clone().greyscale().raw().toBuffer({ resolveWithObject: true });
  return { lum };
}

function stretch(values: number[]): (v: number) => number {
  const sorted = [...values].sort((a, b) => a - b);
  const low = sorted[Math.floor(sorted.length * 0.05)] ?? 0;
  const high = sorted[Math.floor(sorted.length * 0.95)] ?? 1;
  return (v) => (v - low) / (high - low);
}

const dots = (v: number) => (v < 0.12 ? "." : v < 0.28 ? "·" : v < 0.5 ? "•" : "●");

async function sandwormFace(): Promise<string[]> {
  const cols = 32;
  const rows = Math.round((cols * 2100) / 2350);
  const wall = 0.72;
  const { lum } = await grey("WhatsApp Image 2026-11-21 at 21.34.07 (6).jpeg", { left: 450, top: 1250, width: 2350, height: 2100 }, cols, rows);
  const values = [...lum].map((v) => v / 255);
  const level = stretch(values.filter((v) => v <= wall));

  // Eye centres in this crop, measured on the photo. At 32 cells the amber irises are too small to find by colour.
  const eyes = [
    [7.5, 10.5],
    [23.5, 9.5],
  ];
  // An almond for each eye: the centre cells are "O" (a large dot), the rim cells "o" (a small dot).
  const eyeAt = (x: number, y: number): "O" | "o" | undefined => {
    for (const [ex = 0, ey = 0] of eyes) {
      const d = ((x + 0.5 - ex) / 2.8) ** 2 + ((y + 0.5 - ey) / 1.4) ** 2;
      if (d < 0.35) return "O";
      if (d < 1) return "o";
    }
    return undefined;
  };

  return Array.from({ length: rows }, (_, y) =>
    Array.from({ length: cols }, (_, x) => {
      const raw = values[y * cols + x] ?? 0;
      return raw > wall ? " " : (eyeAt(x, y) ?? dots(level(raw)));
    })
      .join("")
      .trimEnd(),
  );
}

const face = await sandwormFace();
await Bun.write(join(ROOT, "src", "fun", "luna-face.txt"), `${face.join("\n")}\n`);
