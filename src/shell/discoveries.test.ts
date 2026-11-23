import { expect, test } from "bun:test";
import { ROOT } from "../fs/tree.ts";
import { fakeTerm, makeShell, stubDocument } from "../test-helpers.ts";
import { ALL_COMMANDS } from "./commands.ts";

stubDocument();

const SECRET = ["sqlite", "sqlite3", "crontab", "dig", "host", "nslookup", "git", "finale", "unmask", "claude", "gpt"];

test("level tools, easter eggs and rival agents are never findable", () => {
  const findable = makeShell(ALL_COMMANDS, ROOT).findable().map((c) => c.name);
  for (const name of SECRET) expect([name, findable.includes(name)]).toEqual([name, false]);
  expect(findable).toContain("zoomies");
});

test("help lists the hidden commands that the player ran, and counts the rest", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS, ROOT);
  await shell.run("zoomies", term);
  lines.length = 0;
  await shell.run("help", term);
  const text = lines.map((l) => l.text);
  expect(text).toContain("Found so far:");
  expect(text.some((l) => l.startsWith("  zoomies "))).toBe(true);
  const left = shell.findable().length - 1;
  expect(text.at(-1)).toBe(`Luna keeps ${left} more commands to herself. Some she shows for sardines.`);
});

test("a new sardine reveals one hidden command that the player has not found", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS, ROOT);
  await shell.run("submit sardine{w3lc0m3_t0_th3_b0x}", term);
  const reveal = lines.find((l) => l.text.startsWith("Luna is pleased. She shows you a trick: "))?.text ?? "";
  const name = reveal.slice("Luna is pleased. She shows you a trick: ".length).split(" ")[0] ?? "";
  expect(shell.found.has(name)).toBe(true);
  expect(shell.findable().map((c) => c.name)).toContain(name);
});
