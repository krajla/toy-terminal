import { expect, test } from "bun:test";
import { CTF_COMMANDS } from "../shell/ctf-commands.ts";
import { fakeTerm, makeShell } from "../test-helpers.ts";
import { FINALE_IDS, openFinale } from "./finale.ts";
import { SARDINES } from "./sardines.ts";

test("the finale key comes from the hard sardines", () => {
  expect(FINALE_IDS).toEqual(SARDINES.filter((s) => s.tier === "hard").map((s) => s.id));
});

test("proofs that are not the real ones do not open the finale", async () => {
  expect(await openFinale(FINALE_IDS.map(() => "0".repeat(64)))).toBeUndefined();
});

test("finale waits until every sardine is found", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(CTF_COMMANDS);
  shell.progress.add("welcome", "proof");
  await shell.run("finale", term);
  expect(lines.at(-1)?.text).toBe(`Luna is not full yet. ${SARDINES.length - 1} sardines to go.`);
});
