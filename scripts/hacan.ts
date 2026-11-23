// Makes public/luna/hacan.png: the Hacan faction sheet of Twilight Imperium with Luna's face and parody text.
// The inputs are in images/ (gitignored). sharp writes no metadata unless asked to.
import sharp, { type OverlayOptions } from "sharp";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const SHEET = join(ROOT, "images", "Pasted 2026-11-23 at 2.58.02 PM.png");
const PHOTO = join(ROOT, "images", "WhatsApp Image 2026-11-21 at 21.34.07 (5).jpeg");
const OUT = process.argv[2] ?? join(ROOT, "public", "luna", "hacan.png");

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

// A median filter wipes thin letters but keeps the colours of the background behind them.
async function erase(sheet: Buffer, box: Box, size = 15): Promise<OverlayOptions> {
  let input = await sharp(sheet).extract(box).median(size).png().toBuffer();
  input = await sharp(input).median(size).blur(2).png().toBuffer();
  const pad = 6;
  const edge = Buffer.from(`<svg width="${box.width}" height="${box.height}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="b"><feGaussianBlur stdDeviation="${pad / 2}"/></filter></defs>
<rect x="${pad}" y="${pad}" width="${box.width - 2 * pad}" height="${box.height - 2 * pad}" fill="#fff" filter="url(#b)"/></svg>`);
  input = await sharp(input).ensureAlpha().composite([{ input: edge, blend: "dest-in" }]).png().toBuffer();
  return { input, left: box.left, top: box.top };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

interface Line {
  x: number;
  y: number;
  text: string;
  size: number;
  font: string;
  fill?: string;
  weight?: string;
  style?: string;
  anchor?: string;
}

// One line of text for each string, from the top down.
const paragraph = (x: number, y: number, step: number, texts: readonly string[], style: Omit<Line, "x" | "y" | "text">): Line[] =>
  texts.map((t, i) => ({ ...style, x, y: y + i * step, text: t }));

function text(lines: Line[]): Buffer {
  const body = lines
    .map(
      (l) =>
        `<text x="${l.x}" y="${l.y}" font-family="${l.font}" font-size="${l.size}" font-weight="${l.weight ?? "normal"}" font-style="${l.style ?? "normal"}" fill="${l.fill ?? "#fff"}" text-anchor="${l.anchor ?? "start"}">${esc(l.text)}</text>`,
    )
    .join("");
  return Buffer.from(`<svg width="1200" height="816" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
}

async function face(): Promise<OverlayOptions> {
  const [w, h] = [126, 134];
  const mask = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="b"><feGaussianBlur stdDeviation="${w / 18}"/></filter></defs>
<ellipse cx="${w / 2}" cy="${h / 2 + 2}" rx="${w * 0.42}" ry="${h * 0.44}" fill="#fff" filter="url(#b)"/></svg>`);
  // A warm shift matches her grey fur to the golden light of the painting.
  const warm = await sharp(PHOTO)
    .rotate()
    .extract({ left: 820, top: 880, width: 940, height: 900 })
    .resize(w, h, { fit: "cover" })
    .linear([1.1, 0.98, 0.78], [8, 0, -12])
    .modulate({ saturation: 1.15 })
    .png()
    .toBuffer();
  const input = await sharp(warm).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return { input, left: 788 - w / 2, top: 152 - h / 2 };
}

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

const COLOURS = 16;

// The art is dithered at half size and scaled back up with hard pixel edges, to match the dithered photos.
// The text goes on afterwards at full size, so that it stays readable.
const painted = await sharp(erased).composite([await face()]).png().toBuffer();
const small = await sharp(painted)
  .resize(600, 408)
  .modulate({ saturation: 0.5, brightness: 0.9 })
  .png({ palette: true, colours: COLOURS, dither: 1 })
  .toBuffer();
const art = await sharp(small).resize(1200, 816, { kernel: "nearest" }).png().toBuffer();
await sharp(art)
  .composite([{ input: text(lines), left: 0, top: 0 }])
  .png({ palette: true, colours: COLOURS + 8, dither: 0, compressionLevel: 9 })
  .toFile(OUT);
console.log(OUT);
