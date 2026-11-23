import { expect, test } from "bun:test";
import { PET_STEPS, PetMood } from "./pet.ts";

test("petting escalates to a bite on the fourth pet, then starts again", () => {
  const mood = new PetMood();
  const verdicts = Array.from({ length: 5 }, () => mood.next().verdict);
  expect(verdicts).toEqual([...PET_STEPS.map((s) => s.verdict), PET_STEPS[0]?.verdict ?? "missing"]);
  expect(PET_STEPS.at(-1)?.art).toContain("( >.< )");
});
