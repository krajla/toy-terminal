import type { Rgb } from "./png.ts";

// Blue-grey ramp from the terminal background to near white, plus two ambers for Luna's eyes and her toys.
export const PALETTE: Rgb[] = [
  [0x0b, 0x0e, 0x14],
  [0x1c, 0x22, 0x30],
  [0x32, 0x3b, 0x4f],
  [0x4f, 0x5b, 0x73],
  [0x7a, 0x86, 0x9c],
  [0xaa, 0xb4, 0xc5],
  [0xdd, 0xe3, 0xec],
  [0xf0, 0xa6, 0x3a],
  [0x8a, 0x5a, 0x1f],
];

const RAMP = PALETTE.slice(0, 7);
const AMBER = 7;
const AMBER_DARK = 8;

const luma = (r: number, g: number, b: number) => 0.299 * r + 0.587 * g + 0.114 * b;
const RAMP_LUMA = RAMP.map(([r, g, b]) => luma(r, g, b));
const STEP = 255 / (RAMP.length - 1);
const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

export interface AmberRule {
  hues: readonly [number, number];
  minValue: number;
  minSaturation: number;
  minNeighbours: number;
}

// Luna's eyes are bright yellow. The sardine toys are orange and brown, so the video uses a wider, darker rule.
export const EYES: AmberRule = { hues: [35, 65], minValue: 140, minSaturation: 0.5, minNeighbours: 2 };

function amberMask(rgb: Uint8Array, width: number, height: number, rule: AmberRule): Uint8Array {
  const count = width * height;
  const raw = new Uint8Array(count);
  for (let i = 0; i < count; i++) {
    const r = rgb[i * 3] ?? 0;
    const g = rgb[i * 3 + 1] ?? 0;
    const b = rgb[i * 3 + 2] ?? 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    if (max < rule.minValue || max - min < rule.minSaturation * max || max !== r) continue;
    const hue = 60 * ((g - b) / (max - min));
    raw[i] = hue >= rule.hues[0] && hue <= rule.hues[1] ? 1 : 0;
  }
  // Drop pixels with too few masked neighbours, so lone specks stay in the grey ramp.
  const mask = new Uint8Array(count);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!raw[y * width + x]) continue;
      let neighbours = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          if ((dx || dy) && nx >= 0 && nx < width && ny >= 0 && ny < height) neighbours += raw[ny * width + nx] ?? 0;
        }
      }
      mask[y * width + x] = neighbours >= rule.minNeighbours ? 1 : 0;
    }
  }
  return mask;
}

const bayer = (x: number, y: number) => ((BAYER4[(y % 4) * 4 + (x % 4)] ?? 0) + 0.5) / 16 - 0.5;

// Luminance from 60 (brown toy) to 140 (orange toy) spreads over dark and light amber.
function amberShade(v: number, x: number, y: number): number {
  const t = Math.min(1, Math.max(0, (v - 60) / 80));
  return t + bayer(x, y) > 0.5 ? AMBER : AMBER_DARK;
}

function nearestRamp(v: number): number {
  let best = 0;
  RAMP_LUMA.forEach((l, k) => {
    if (Math.abs(v - l) < Math.abs(v - (RAMP_LUMA[best] ?? 0))) best = k;
  });
  return best;
}

// Floyd-Steinberg on luminance. Amber pixels are set directly and absorb no error.
export function errorDiffusion(rgb: Uint8Array, width: number, height: number, rule: AmberRule = EYES): Uint8Array {
  const count = width * height;
  const mask = amberMask(rgb, width, height, rule);
  const lum = new Float32Array(count);
  const out = new Uint8Array(count);
  for (let i = 0; i < count; i++) lum[i] = luma(rgb[i * 3] ?? 0, rgb[i * 3 + 1] ?? 0, rgb[i * 3 + 2] ?? 0);

  const spread = (x: number, y: number, err: number, weight: number) => {
    if (x < 0 || x >= width || y >= height) return;
    lum[y * width + x] = (lum[y * width + x] ?? 0) + err * weight;
  };
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (mask[i]) {
        out[i] = amberShade(lum[i] ?? 0, x, y);
        continue;
      }
      const v = lum[i] ?? 0;
      const best = nearestRamp(v);
      out[i] = best;
      const err = v - (RAMP_LUMA[best] ?? 0);
      spread(x + 1, y, err, 7 / 16);
      spread(x - 1, y + 1, err, 3 / 16);
      spread(x, y + 1, err, 5 / 16);
      spread(x + 1, y + 1, err, 1 / 16);
    }
  }
  return out;
}

// Ordered dithering: each pixel depends only on itself, so still areas do not flicker between video frames.
export function ordered(rgb: Uint8Array, width: number, height: number, rule: AmberRule = EYES): Uint8Array {
  const count = width * height;
  const mask = amberMask(rgb, width, height, rule);
  const out = new Uint8Array(count);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const v = luma(rgb[i * 3] ?? 0, rgb[i * 3 + 1] ?? 0, rgb[i * 3 + 2] ?? 0);
      out[i] = mask[i] ? amberShade(v, x, y) : nearestRamp(v + bayer(x, y) * STEP);
    }
  }
  return out;
}
