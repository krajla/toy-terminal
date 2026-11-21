import { expect, test } from "bun:test";
import sharp from "sharp";
import { encodeIndexedPng } from "./png.ts";

test("encodes an indexed PNG that decodes to the palette colors, with no metadata", async () => {
  const palette = [
    [0, 0, 0],
    [255, 128, 0],
  ] as const;
  const png = encodeIndexedPng(3, 2, palette, new Uint8Array([0, 1, 0, 1, 1, 0]));

  const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
  expect([info.width, info.height, info.channels]).toEqual([3, 2, 3]);
  expect([...data.subarray(0, 6)]).toEqual([0, 0, 0, 255, 128, 0]);

  const meta = await sharp(png).metadata();
  expect(meta.exif).toBeUndefined();
  expect(meta.isPalette).toBe(true);
});

test("rejects an index count that does not match the size", () => {
  expect(() => encodeIndexedPng(2, 2, [[0, 0, 0]], new Uint8Array(3))).toThrow("index count does not match the image size");
});
