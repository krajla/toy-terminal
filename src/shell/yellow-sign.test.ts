import { expect, test } from "bun:test";
import { CASSILDA, IMPOSSIBLE_LANDSCAPES } from "../fun/king-in-yellow.ts";
import { roll } from "../fun/roll.ts";
import { fakeTerm, makeShell, stubDocument } from "../test-helpers.ts";
import { ALL_COMMANDS } from "./commands.ts";

stubDocument();

const KING_LINES = new Set(IMPOSSIBLE_LANDSCAPES.flat());

test("a marked player rolls the Yellow Sign with every game", () => {
  for (const spec of ["d20", "2d10", "2d6", "d100"]) {
    const r = roll(spec, Math.random, { marked: true });
    if (typeof r === "string") throw new Error(r);
    expect([spec, r.yellowSign]).toEqual([spec, true]);
    expect(r.lines.some((l) => KING_LINES.has(l))).toBe(true);
  }
});

test("the first two Delta Green rolls never show the Sign", async () => {
  const { term } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS);
  // Math.random below 1/5 shows the Sign on any allowed roll.
  const random = Math.random;
  Math.random = () => 0.01;
  try {
    await shell.run("roll d100", term);
    await shell.run("roll d100", term);
    expect(shell.mark.has).toBe(false);
    await shell.run("roll d100", term);
    expect(shell.mark.has).toBe(true);
  } finally {
    Math.random = random;
  }
});

test("the song takes over the line right after the roll that marks the player", async () => {
  const { term } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS);
  await shell.run("whoami", term);
  await shell.run("whoami", term);
  const random = Math.random;
  Math.random = () => 0.01;
  try {
    for (let i = 0; i < 3; i++) await shell.run("roll d100", term);
  } finally {
    Math.random = random;
  }
  expect(shell.mark.has).toBe(true);
  expect(shell.possession()).toBe(CASSILDA[0]);
});

test("the mark shows in the prompt, brings Cassilda's Song, and unmask removes it", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS);
  expect(shell.promptParts().map((p) => p.cls)).toEqual(["prompt"]);

  shell.mark.set(true);
  expect(shell.promptParts().map((p) => p.cls)).toEqual(["prompt", "sign-mark", "prompt"]);
  // The terminal types the song over the player's keys, so "clear" arrives as "Along".
  expect(shell.possession()).toBe(CASSILDA[0]);
  await shell.run("Along", term);
  expect(lines).toEqual([{ text: CASSILDA[0] ?? "", cls: "yellow song" }]);
  expect(shell.possession()).toBeUndefined();

  lines.length = 0;
  await shell.run("unmask", term);
  expect(shell.mark.has).toBe(false);
  expect(lines.at(-1)?.text).toStartWith("The Sign fades");
  expect(shell.promptParts().map((p) => p.cls)).toEqual(["prompt"]);
});

test("unmask without the mark changes nothing", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS);
  await shell.run("unmask", term);
  expect(lines.map((l) => l.text)).toEqual(['"I wear no mask."']);
});
