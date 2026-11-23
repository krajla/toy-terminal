// Makes public/luna/leader.png: the Agitator leader card of Arcs with Luna's face, her name and her abilities.
// The inputs are in images/ (gitignored).
import sharp from "sharp";
import { join } from "node:path";
import { erase, face, lowBit, text, type Line } from "./lib/compose.ts";

const ROOT = join(import.meta.dir, "..");
const CARD = join(ROOT, "images", "Pasted 2026-11-24 at 12.05.17 AM.png");
const PHOTO = join(ROOT, "images", "WhatsApp Image 2026-11-21 at 21.34.07 (6).jpeg");
const OUT = process.argv[2] ?? join(ROOT, "public", "luna", "arcs-leader.png");
const [WIDTH, HEIGHT] = [689, 1181];

const PANEL = "#fdfdfc";
const INK = "#1b1b1b";
const BODY = "Avenir Next";

// The title and the abilities sit on the plain white panel of the card, so white boxes wipe them.
const blank = (left: number, top: number, width: number, height: number) => ({
  input: Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="${PANEL}"/></svg>`),
  left,
  top,
});

// Luna's abilities, one line of the card for each entry. The first line of an ability starts with its name.
const ABILITIES: [name: string, lines: string[]][] = [
  ["Sits On It.", [" Luna sits on one card in the", "court. No one can secure that card", "while she is on it."]],
  ["Knocks Things Over.", [" At the end of each", "round, remove 1 ship. Not from the", "board. From the table."]],
];

const lines: Line[] = [
  { x: 345, y: 662, text: "LUNA", size: 50, font: "Copperplate", weight: "700", fill: INK, anchor: "middle" },
  { x: 622, y: 72, text: "09", size: 24, font: BODY, weight: "700", anchor: "middle" },
];
let y = 740;
for (const [name, body] of ABILITIES) {
  body.forEach((piece, i) => {
    const spans = i ? [{ text: piece }] : [{ text: name, style: "italic" }, { text: piece }];
    lines.push({ x: 50, y, text: "", size: 28, font: BODY, fill: INK, spans });
    y += 38;
  });
  y += 18;
}

const original = await sharp(CARD).png().toBuffer();
const lunaFace = await face({
  photo: PHOTO,
  crop: { left: 560, top: 1260, width: 2160, height: 2200 },
  width: 172,
  height: 168,
  centerX: 337,
  centerY: 200,
  shift: { a: [1.12, 1.12, 1.12], b: [14, 14, 14], saturation: 1 },
});
const painted = await sharp(original)
  .composite([
    blank(150, 612, 390, 62),
    blank(40, 690, 608, 325),
    await erase(original, { left: 594, top: 46, width: 48, height: 36 }),
    lunaFace,
  ])
  .png()
  .toBuffer();
await lowBit(painted, text(lines, WIDTH, HEIGHT), OUT, { width: WIDTH, height: HEIGHT, colours: 16, saturation: 0.55, brightness: 0.95 });
console.log(OUT);
