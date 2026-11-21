import { deflateSync } from "node:zlib";

export type Rgb = readonly [number, number, number];

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (const b of bytes) c = (CRC_TABLE[(c ^ b) & 0xff] ?? 0) ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const view = new DataView(out.buffer);
  view.setUint32(0, data.length);
  out.set(new TextEncoder().encode(type), 4);
  out.set(data, 8);
  view.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

// Writes only IHDR, PLTE, an optional tRNS, IDAT and IEND, so the output never carries metadata.
export function encodeIndexedPng(
  width: number,
  height: number,
  palette: readonly Rgb[],
  indices: Uint8Array,
  transparentIndex?: number,
): Uint8Array {
  if (palette.length > 256) throw new Error("palette has more than 256 colors");
  if (indices.length !== width * height) throw new Error("index count does not match the image size");

  const ihdr = new Uint8Array(13);
  const view = new DataView(ihdr.buffer);
  view.setUint32(0, width);
  view.setUint32(4, height);
  ihdr.set([8, 3, 0, 0, 0], 8);

  const raw = new Uint8Array(height * (width + 1));
  for (let y = 0; y < height; y++) raw.set(indices.subarray(y * width, (y + 1) * width), y * (width + 1) + 1);

  const parts = [
    new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", new Uint8Array(palette.flat())),
    ...(transparentIndex === undefined
      ? []
      : [chunk("tRNS", Uint8Array.from({ length: transparentIndex + 1 }, (_, i) => (i === transparentIndex ? 0 : 255)))]),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", new Uint8Array()),
  ];
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
