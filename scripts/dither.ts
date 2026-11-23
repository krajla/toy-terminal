// Turns the original photos in images/ (gitignored) into dithered, metadata-free PNGs in public/luna/.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { LUNA_PHOTOS } from "../src/luna.ts";
import { errorDiffusion, PALETTE } from "./lib/dither.ts";
import { encodeIndexedPng } from "./lib/png.ts";

const ROOT = join(import.meta.dir, "..");

interface Source {
  file: string;
  crop?: { left: number; top: number; width: number; height: number };
}

// Crops keep people, clothes, a foot, and the box-lid portrait of the Ark Nova designer out of frame.
const SOURCES: Record<string, Source> = {
  judge: { file: "WhatsApp Image 2026-11-21 at 13.47.47.jpeg", crop: { left: 300, top: 800, width: 2400, height: 3200 } },
  peek: { file: "WhatsApp Image 2026-11-21 at 13.47.47 (1).jpeg", crop: { left: 1000, top: 1200, width: 1800, height: 2400 } },
  belly: { file: "WhatsApp Image 2026-11-21 at 13.47.47 (2).jpeg", crop: { left: 500, top: 800, width: 2400, height: 2400 } },
  box: { file: "WhatsApp Image 2026-11-21 at 13.47.48.jpeg", crop: { left: 250, top: 1800, width: 2000, height: 1600 } },
  laptop: { file: "WhatsApp Image 2026-11-21 at 13.47.48 (1).jpeg" },
  upside: { file: "WhatsApp Image 2026-11-21 at 21.30.49 (1).jpeg" },
  pillow: { file: "WhatsApp Image 2026-11-21 at 21.30.49.jpeg" },
  blep: { file: "WhatsApp Image 2026-11-21 at 21.34.07 (2).jpeg", crop: { left: 0, top: 300, width: 900, height: 1200 } },
  sleep: { file: "WhatsApp Image 2026-11-21 at 21.34.07 (3).jpeg", crop: { left: 0, top: 1000, width: 3000, height: 3000 } },
  nap: { file: "WhatsApp Image 2026-11-21 at 21.34.07 (4).jpeg", crop: { left: 1400, top: 1100, width: 2600, height: 1900 } },
  sit: { file: "WhatsApp Image 2026-11-21 at 21.34.07 (5).jpeg" },
  stare: { file: "WhatsApp Image 2026-11-21 at 21.34.07 (6).jpeg" },
  desk: { file: "WhatsApp Image 2026-11-21 at 21.35.03 (1).jpeg" },
  league: { file: "WhatsApp Image 2026-11-21 at 21.34.07.jpeg", crop: { left: 0, top: 700, width: 3024, height: 3332 } },
  swipe: { file: "WhatsApp Image 2026-11-21 at 21.35.03 (2).jpeg" },
  boss: { file: "WhatsApp Image 2026-11-21 at 21.35.03.jpeg" },
  leader: { file: "WhatsApp Image 2026-11-21 at 13.47.47.jpeg", crop: { left: 1050, top: 1650, width: 1200, height: 1100 } },
  night: { file: "WhatsApp Image 2026-11-21 at 21.34.07 (1).jpeg", crop: { left: 0, top: 1000, width: 2550, height: 3000 } },
};

const outDir = join(ROOT, "public", "luna");
await mkdir(outDir, { recursive: true });
for (const photo of LUNA_PHOTOS) {
  const source = SOURCES[photo.name];
  if (!source) throw new Error(`no source photo for ${photo.name}`);
  let img = sharp(join(ROOT, "images", source.file)).rotate();
  if (source.crop) img = img.extract(source.crop);
  const { data, info } = await img
    .resize(photo.width, photo.height, { fit: "cover" })
    .normalise()
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const indices = errorDiffusion(new Uint8Array(data), info.width, info.height);
  await Bun.write(join(outDir, `${photo.name}.png`), encodeIndexedPng(info.width, info.height, PALETTE, indices));
  console.log(`public/luna/${photo.name}.png  ${info.width}x${info.height}`);
}
