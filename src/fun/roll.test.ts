import { describe, expect, test } from "bun:test";
import { parseDice, roll, type RollResult, type Rng } from "./roll.ts";

// Returns the given values in order. A die with N sides shows floor(value * N) + 1.
function sequence(...values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i++];
    if (v === undefined) throw new Error("sequence ran out");
    return v;
  };
}

const face = (n: number, sides: number) => (n - 0.5) / sides;

function result(r: RollResult | string): RollResult {
  if (typeof r === "string") throw new Error(r);
  return r;
}

describe("parseDice", () => {
  test("reads count, sides and modifier", () => {
    expect(parseDice("d20")).toEqual({ count: 1, sides: 20, modifier: 0 });
    expect(parseDice("3d6-1")).toEqual({ count: 3, sides: 6, modifier: -1 });
  });

  test("rejects junk and too many dice", () => {
    expect(parseDice("banana")).toBeUndefined();
    expect(parseDice("21d6")).toBeUndefined();
    expect(parseDice("d1")).toBeUndefined();
  });
});

describe("roll", () => {
  test("d20 is always D&D, and a natural 20 is a critical hit", () => {
    const r = result(roll("d20", sequence(0, face(20, 20))));
    expect(r.system).toBe("D&D");
    expect(r.lines[1]).toContain("Natural 20");
  });

  test("Blades: two sixes is a critical, a highest 4 or 5 is partial, 1-3 is bad", () => {
    // The first value picks Blades from the systems that fit Nd6 (D&D, Blades).
    expect(result(roll("2d6", sequence(0.75, face(6, 6), face(6, 6)))).lines[1]).toContain("Critical");
    expect(result(roll("2d6", sequence(0.75, face(5, 6), face(2, 6), 0))).lines[1]).toContain("Partial success");
    expect(result(roll("2d6", sequence(0.75, face(3, 6), face(1, 6)))).lines[1]).toContain("Bad outcome");
  });

  test("Heart wins every roll that its dice fit, and the party member's line follows the highest d10", () => {
    expect(result(roll("2d10", sequence(face(7, 10), face(3, 10)), { character: "Alex" })).lines[1]).toBe(
      "Alex: It works, but the ink on your fingers isn't yours, and the glyph it made isn't one you know. Succeed, and take stress.",
    );
    expect(result(roll("2d10", sequence(face(1, 10), face(1, 10)), { character: "Yl" })).lines[1]).toBe(
      "Yl: The hive goes silent. The Heartbeet skips. Fail, and take double stress.",
    );
    expect(result(roll("3d10", sequence(face(4, 10), face(10, 10), face(2, 10)), { character: "Ash-On-Snow" })).lines[1]).toBe(
      "Ash-On-Snow: For one moment the debt feels lighter. Critical success: your outgoing stress die steps up once.",
    );
    const stress = result(roll("d8", sequence(face(5, 8), 0), { character: "Balthazar" }));
    expect([stress.system, stress.lines[1]]).toEqual(["Heart: The City Beneath", "Balthazar takes 5 stress to Blood. The Heart notices."]);
  });

  test("Delta Green: matching digits under the skill is a critical, 100 is a fumble", () => {
    // d100 fits only Delta Green. The skill pick 0 selects Alertness 50%. The last value 0.9 skips the King in Yellow.
    const crit = result(roll("d100", sequence(0, face(44, 100), 0, 0.9)));
    expect(crit.lines).toEqual(["1d100: [44]  (Delta Green)", "44 against Alertness 50%.", "Critical success. Twice as good. Do not write it down."]);
    expect(crit.yellowSign).toBeUndefined();
    expect(result(roll("d100", sequence(0, face(100, 100), 0, 0.9))).lines[2]).toContain("Fumble");
    expect(result(roll("d100", sequence(0, face(77, 100), 0, 0.9))).lines[2]).toContain("Fumble");
    expect(result(roll("d100", sequence(0, face(51, 100), 0, 0.9))).lines[2]).toContain("Failure");
  });

  test("about one Delta Green roll in three shows the Yellow Sign and a King in Yellow line", () => {
    const r = result(roll("d100", sequence(0, face(30, 100), 0, 0.1, 0)));
    expect(r.yellowSign).toBe(true);
    expect(r.lines.at(-1)).toBe("Have you found the Yellow Sign?");
  });

  test("too many dice of a type that a system uses names that system, not the die", () => {
    const r = result(roll("2d100", sequence(face(52, 100), face(28, 100))));
    expect(r.system).toBe("none");
    expect(r.lines[1]).toBe("No game at Robert's table rolls 2d100. Delta Green rolls one d100 at a time. Total: 80.");
  });

  test("a die that no system uses still rolls", () => {
    const r = result(roll("d7", sequence(face(3, 7))));
    expect(r.system).toBe("none");
    expect(r.lines[1]).toContain("Total: 3");
  });

  test("a bare roll is a Heart pool", () => {
    const r = result(roll(undefined, sequence(face(9, 10), face(2, 10)), { character: "Balthazar" }));
    expect(r.system).toBe("Heart: The City Beneath");
    expect(r.lines[1]).toBe("Balthazar: A tall shadow, a quiet step, and the job's done. Succeed.");
  });

  test("bad input returns a usage message", () => {
    expect(roll("lots")).toStartWith("roll: cannot read 'lots'");
  });

  test("dice that cannot exist get a joke instead of the usage hint", () => {
    expect(roll("d1")).toBe("A d1 is a marble. Luna bats it under the sofa. It rolled a 1.");
    expect(roll("d0")).toStartWith("A d0 has no faces.");
    expect(roll("0d6")).toStartWith("You roll no dice at all.");
    expect(roll("21d6")).toStartWith("You pour 21 dice on the table.");
    expect(roll("d5000")).toStartWith("A d5000 is not a die, it is a ball.");
  });
});
