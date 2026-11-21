import { expect, test } from "bun:test";
import { ROOT } from "../fs/tree.ts";
import { fakeTerm, makeShell } from "../test-helpers.ts";
import { ALL_COMMANDS } from "./commands.ts";

// Commands that show a photo or a clip build DOM elements. This stub has the parts they touch.
const element = () => ({ style: { setProperty() {} }, append() {}, setAttribute() {} });
Object.assign(globalThis, { document: { createElement: element, createElementNS: element } });

test("command names are unique", () => {
  const names = ALL_COMMANDS.map((c) => c.name);
  expect(new Set(names).size).toBe(names.length);
});

test("help lists only visible commands", async () => {
  const { term, lines } = fakeTerm();
  await makeShell(ALL_COMMANDS, ROOT).run("help", term);
  const text = lines.map((l) => l.text).join("\n");
  for (const c of ALL_COMMANDS) {
    const listed = new RegExp(`^  ${c.name} `, "m").test(text);
    expect([c.name, listed]).toEqual([c.name, !c.hidden]);
  }
});

const SMOKE = [
  "whoami", "about", "contact", "inflexa", "man luna", "man ls", "man nope", "fortune", "roll", "roll 3d6", "roll d100", "roll d20", "roll x",
  "luna", "luna judge", "zoomies", "play", "play sardines", "play ark-nova", "play uprising", "play dune", "play arcs", "play ti4",
  "feed luna", "feed robert", "pet luna", "catsay hello", "sl", "matrix", "hack", "coffee", "sudo ls", "rm x",
  "rm -rf /", "exit", "gg", "ff15", "top", "uptime", "history",
];

test("every command runs without an error", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS, ROOT);
  for (const line of SMOKE) {
    lines.length = 0;
    await shell.run(line, term);
    expect([line, lines.some((l) => l.text.startsWith("luna-sh:"))]).toEqual([line, false]);
    expect([line, lines.length > 0]).toEqual([line, true]);
  }
});

test("rm -rf / only pretends", async () => {
  const { term, lines } = fakeTerm();
  await makeShell(ALL_COMMANDS, ROOT).run("rm -rf /", term);
  expect(lines.at(-1)?.text).toStartWith("jk.");
});
