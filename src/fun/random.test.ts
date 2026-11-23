import { expect, test } from "bun:test";
import { freshPicker } from "./random.ts";

const zero = () => 0;

test("the picker never gives the same item twice in a row", () => {
  const pick = freshPicker(["a", "b", "c"]);
  expect([pick(zero), pick(zero), pick(zero), pick(zero)]).toEqual(["a", "b", "a", "b"]);
});
