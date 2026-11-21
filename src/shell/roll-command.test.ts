import { expect, test } from "bun:test";
import { PARTY } from "../fun/roll.ts";
import { fakeTerm, makeShell } from "../test-helpers.ts";
import { ALL_COMMANDS } from "./commands.ts";

const element = () => ({ style: { setProperty() {} }, append() {}, setAttribute() {} });
Object.assign(globalThis, { document: { createElement: element, createElementNS: element } });

const speaker = (text: string) => PARTY.find((p) => text.startsWith(`${p.name}:`))?.name;

test("Heart rolls go round the whole table before anyone rolls again", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS);
  const speakers: (string | undefined)[] = [];
  for (let i = 0; i < PARTY.length * 2; i++) {
    lines.length = 0;
    await shell.run("roll 2d10", term);
    speakers.push(lines.map((l) => speaker(l.text)).find(Boolean));
  }
  const firstRound = speakers.slice(0, PARTY.length);
  expect(new Set(firstRound).size).toBe(PARTY.length);
  expect(speakers.slice(PARTY.length)).toEqual(firstRound);
});

test("--as picks the party member by name prefix and rejects strangers", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS);
  await shell.run("roll 2d10 --as yl", term);
  expect(lines.map((l) => speaker(l.text)).find(Boolean)).toBe("Yl");
  lines.length = 0;
  await shell.run("roll --as ash", term);
  expect(lines.map((l) => speaker(l.text)).find(Boolean)).toBe("Ash-On-Snow");
  lines.length = 0;
  await shell.run("roll 2d10 --as luna", term);
  expect(lines.map((l) => l.text)).toEqual(["roll: no one called 'luna' at the table."]);
});
