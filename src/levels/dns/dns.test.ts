import { expect, test } from "bun:test";
import { lookup } from "../../fs/fs.ts";
import { ROOT } from "../../fs/tree.ts";
import { ALL_COMMANDS } from "../../shell/commands.ts";
import { fakeTerm, makeShell } from "../../test-helpers.ts";

test("/etc/hosts points at DNS text under an underscore, without the full name", () => {
  const hosts = lookup(ROOT, "/etc/hosts");
  const text = hosts?.kind === "file" ? hosts.content : "";
  expect(text).toContain("Text only, under an underscore.");
  expect(text).not.toContain("_sardine");
});

test("the resolver commands send the player to a real resolver, and git hints at a public history", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS, ROOT);
  await shell.run("dig TXT luna.krajla.space", term);
  expect(lines.at(-1)?.text).toBe(";; Ask a real resolver, from your own machine.");
  await shell.run("git log", term);
  expect(lines.at(-1)?.text).toBe("This machine has no history. Robert keeps his somewhere more public.");
});
