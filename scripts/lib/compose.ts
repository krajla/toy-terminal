// Helpers to edit a scanned game card or sheet: wipe text, paste Luna's face, draw new text, and give it the
// dithered low-bit look of the photos. sharp writes no metadata unless asked to.
import sharp, { type OverlayOptions } from "sharp";

export interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

// A median filter wipes thin letters but keeps the colours of the background behind them. Soft edges hide the patch.
export async function erase(sheet: Buffer, box: Box, size = 15): Promise<OverlayOptions> {
  let input = await sharp(sheet).extract(box).median(size).png().toBuffer();
  input = await sharp(input).median(size).blur(2).png().toBuffer();
  const pad = 6;
  const edge = Buffer.from(`<svg width="${box.width}" height="${box.height}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="b"><feGaussianBlur stdDeviation="${pad / 2}"/></filter></defs>
<rect x="${pad}" y="${pad}" width="${box.width - 2 * pad}" height="${box.height - 2 * pad}" fill="#fff" filter="url(#b)"/></svg>`);
  input = await sharp(input).ensureAlpha().composite([{ input: edge, blend: "dest-in" }]).png().toBuffer();
  return { input, left: box.left, top: box.top };
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

export interface Line {
  x: number;
  y: number;
  text: string;
  size: number;
  font: string;
  fill?: string;
  weight?: string;
  style?: string;
  anchor?: string;
  /** Pieces of the line with their own style, for example an italic name in front of regular text. */
  spans?: { text: string; style?: string; weight?: string }[];
}

// One line of text for each string, from the top down.
export const paragraph = (x: number, y: number, step: number, texts: readonly string[], style: Omit<Line, "x" | "y" | "text">): Line[] =>
  texts.map((t, i) => ({ ...style, x, y: y + i * step, text: t }));

export function text(lines: Line[], width: number, height: number): Buffer {
  const body = lines
    .map(
      (l) =>
        `<text x="${l.x}" y="${l.y}" font-family="${l.font}" font-size="${l.size}" font-weight="${l.weight ?? "normal"}" font-style="${l.style ?? "normal"}" fill="${l.fill ?? "#fff"}" text-anchor="${l.anchor ?? "start"}" xml:space="preserve">${
          l.spans
            ? l.spans.map((s) => `<tspan font-style="${s.style ?? "normal"}" font-weight="${s.weight ?? "normal"}">${esc(s.text)}</tspan>`).join("")
            : esc(l.text)
        }</text>`,
    )
    .join("");
  return Buffer.from(`<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${body}</svg>`);
}

export interface FaceOptions {
  photo: string;
  crop: Box;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
  /** A colour shift as sharp `linear` factors and offsets, to match the fur to the light of the art. */
  shift?: { a: number[]; b: number[]; saturation: number };
}

// Luna's face from a photo, cut out with a soft oval, for the place of a face in the art.
export async function face(opts: FaceOptions): Promise<OverlayOptions> {
  const { width: w, height: h } = opts;
  const mask = Buffer.from(`<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg"><defs><filter id="b"><feGaussianBlur stdDeviation="${w / 18}"/></filter></defs>
<ellipse cx="${w / 2}" cy="${h / 2 + 2}" rx="${w * 0.42}" ry="${h * 0.44}" fill="#fff" filter="url(#b)"/></svg>`);
  let photo = sharp(opts.photo).rotate().extract(opts.crop).resize(w, h, { fit: "cover" });
  if (opts.shift) photo = photo.linear(opts.shift.a, opts.shift.b).modulate({ saturation: opts.shift.saturation });
  const input = await sharp(await photo.png().toBuffer()).ensureAlpha().composite([{ input: mask, blend: "dest-in" }]).png().toBuffer();
  return { input, left: opts.centerX - w / 2, top: opts.centerY - h / 2 };
}

export interface LowBitOptions {
  width: number;
  height: number;
  colours: number;
  saturation: number;
  brightness: number;
}

// The art is dithered at half size and scaled back up with hard pixel edges, to match the dithered photos.
// The text goes on afterwards at full size, so that it stays readable.
export async function lowBit(painted: Buffer, words: Buffer, out: string, opts: LowBitOptions): Promise<void> {
  const small = await sharp(painted)
    .resize(Math.round(opts.width / 2), Math.round(opts.height / 2))
    .modulate({ saturation: opts.saturation, brightness: opts.brightness })
    .png({ palette: true, colours: opts.colours, dither: 1 })
    .toBuffer();
  const art = await sharp(small).resize(opts.width, opts.height, { kernel: "nearest" }).png().toBuffer();
  await sharp(art)
    .composite([{ input: words, left: 0, top: 0 }])
    .png({ palette: true, colours: opts.colours + 8, dither: 0, compressionLevel: 9 })
    .toFile(out);
}
