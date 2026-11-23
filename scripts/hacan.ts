// Makes public/luna/hacan.png: the Hacan faction sheet of Twilight Imperium with Luna's face and parody text.
// The inputs are in images/ (gitignored). sharp writes no metadata unless asked to.
import sharp from "sharp";
import { join } from "node:path";
import { erase, face, lowBit, paragraph, text, type Line } from "./lib/compose.ts";

const ROOT = join(import.meta.dir, "..");
const SHEET = join(ROOT, "images", "Pasted 2026-11-23 at 2.58.02 PM.png");
const PHOTO = join(ROOT, "images", "WhatsApp Image 2026-11-21 at 21.34.07 (5).jpeg");
const OUT = process.argv[2] ?? join(ROOT, "public", "luna", "hacan.png");

const TITLE = "Avenir Next";
const BODY = "Avenir Next";
const GOLD = "#e8c547";

const original = await sharp(SHEET).png().toBuffer();
// The unit cards that get a new name: the left edge and baseline of the old title, and its width.
const UNITS = [
  { x: 46, y: 242, old: 70, name: "SUN PATCH" },
  { x: 341, y: 441, old: 96, name: "LASER POINTER I" },
  { x: 45, y: 641, old: 72, name: "CAT CARRIER I" },
  { x: 930, y: 640, old: 100, name: "FOOD BOWL I" },
];

const erased = await sharp(original)
  .composite(
    await Promise.all(
      [
        // The title letters are thick, so they need a wider filter than the small text.
        erase(original, { left: 410, top: 10, width: 565, height: 60 }, 31),
        erase(original, { left: 886, top: 114, width: 310, height: 78 }),
        erase(original, { left: 906, top: 200, width: 290, height: 182 }),
        erase(original, { left: 54, top: 22, width: 176, height: 46 }),
        erase(original, { left: 36, top: 64, width: 240, height: 58 }),
        ...UNITS.map(({ x, y, old }) => erase(original, { left: x - 8, top: y - 18, width: old + 16, height: 25 })),
      ],
    ),
  )
  .png()
  .toBuffer();

const ABILITIES = [
  { y: 222, head: "MASTERS OF TREATS", body: ["You do not have to spend a command token", "to resolve the secondary ability of the “Treat”", "strategy card."] },
  { y: 287, head: "GUILD SHIPS", body: ["You can negotiate transactions with humans", "who are not your owner."] },
  { y: 337, head: "ARBITERS", body: ["When you are negotiating a transaction,", "the sofa can be exchanged as part of that", "transaction. It comes back."] },
];

const quote = { size: 13, font: BODY, style: "italic", anchor: "middle" };
const lines: Line[] = [
  { x: 690, y: 52, text: "THE EMIRATES OF LUNA", size: 42, font: TITLE, weight: "700", anchor: "middle" },
  ...paragraph(1040, 137, 16, ["“There is no price too great for a sardine,", "no pillow too soft, and no nap too long.", "My humans will persevere.”"], quote),
  { ...quote, x: 1110, y: 182, text: "—Luna, Emir of the Sofa" },
  ...ABILITIES.flatMap(({ y, head, body }) =>
    Array.of<Line>({ x: 914, y, text: head, size: 13, font: BODY, weight: "700" }).concat(paragraph(924, y + 16, 14, body, { size: 12, font: BODY })),
  ),
  { x: 64, y: 44, text: "WRATH AT 5 AM", size: 17, font: TITLE, weight: "800" },
  { x: 64, y: 56, text: "LUNA FLAGSHIP", size: 9, font: BODY, weight: "700", fill: GOLD },
  ...UNITS.map(({ x, y, name }) => ({ x, y, text: name, size: 15, font: TITLE, weight: "700" })),
  ...paragraph(46, 84, 14, ["After you knock a die off the table during a", "space combat in this system, you may spend", "1 sardine to apply +1 to the result."], { size: 12, font: BODY }),
];

// A warm shift matches her grey fur to the golden light of the painting.
const lunaFace = await face({
  photo: PHOTO,
  crop: { left: 820, top: 880, width: 940, height: 900 },
  width: 126,
  height: 134,
  centerX: 788,
  centerY: 152,
  shift: { a: [1.1, 0.98, 0.78], b: [8, 0, -12], saturation: 1.15 },
});
const painted = await sharp(erased).composite([lunaFace]).png().toBuffer();
await lowBit(painted, text(lines, 1200, 816), OUT, { width: 1200, height: 816, colours: 16, saturation: 0.5, brightness: 0.9 });
console.log(OUT);
