// Turns the sardine video in images/ (gitignored) into a dithered sprite sheet in public/luna/, without audio or metadata.
import { join } from "node:path";
import { PLAY_CLIP } from "../src/luna.ts";
import { ordered, PALETTE, type AmberRule } from "./lib/dither.ts";
import { encodeIndexedPng } from "./lib/png.ts";

const ROOT = join(import.meta.dir, "..");
const VIDEO = join(ROOT, "images", "WhatsApp Video 2026-11-21 at 21.30.49.mp4");
const SARDINE_TOYS: AmberRule = { hues: [5, 40], minValue: 70, minSaturation: 0.6, minNeighbours: 4 };
const START_SECONDS = 6;
const { name, width, height, frames, fps } = PLAY_CLIP;

// The cat and the toy fill the middle band of the portrait video.
const filter = `fps=${fps},crop=560:420:160:470,scale=${width}:${height}:flags=area,eq=contrast=1.5:brightness=0.04`;
const ffmpeg = Bun.spawn(["ffmpeg", "-v", "error", "-ss", String(START_SECONDS), "-i", VIDEO, "-vf", filter, "-frames:v", String(frames), "-f", "rawvideo", "-pix_fmt", "rgb24", "-"], {
  stdout: "pipe",
});
const raw = new Uint8Array(await new Response(ffmpeg.stdout).arrayBuffer());
if ((await ffmpeg.exited) !== 0) throw new Error("ffmpeg failed");

const frameBytes = width * height * 3;
if (raw.length !== frameBytes * frames) throw new Error(`expected ${frames} frames, got ${raw.length / frameBytes}`);

const sheet = new Uint8Array(width * height * frames);
for (let f = 0; f < frames; f++) {
  const frame = raw.subarray(f * frameBytes, (f + 1) * frameBytes);
  sheet.set(ordered(frame, width, height, SARDINE_TOYS), f * width * height);
}
const png = encodeIndexedPng(width, height * frames, PALETTE, sheet);
await Bun.write(join(ROOT, "public", "luna", `${name}.png`), png);
console.log(`public/luna/${name}.png  ${width}x${height} x ${frames} frames, ${png.length} bytes`);
