import { expect, test } from "bun:test";
import { SARDINES } from "../ctf/sardines.ts";
import { ALL_COMMANDS } from "./commands.ts";
import { fakeTerm } from "../test-helpers.ts";
import { intro } from "./intro.ts";

test("the start screen names only real commands and the number of sardines", () => {
  const { term, lines } = fakeTerm();
  intro(term);
  const text = lines.map((l) => l.text).join("\n");
  expect(text).toContain(`Luna hid ${SARDINES.length} sardines`);
  const names = new Set(ALL_COMMANDS.map((c) => c.name));
  for (const [, command] of text.matchAll(/^ {2}(\w+) /gm)) expect([command, names.has(command ?? "")]).toEqual([command, true]);
});
