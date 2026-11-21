import { expect, test } from "bun:test";
import { fakeTerm, makeShell } from "../test-helpers.ts";
import type { Command } from "./shell.ts";

const echo: Command = { name: "echo", summary: "", run: (args, term) => term.print(args.join("|")) };
const secret: Command = { name: "secret", summary: "", hidden: true, run: (_a, term) => term.print("found") };
const sub: Command = {
  name: "sub",
  summary: "",
  run: (_a, term) => term.push({ prompt: "> ", run: (line, t) => (line === "quit" ? t.pop() : t.print(line)) }),
  complete: () => ["alpha", "beta"],
};

test("runs a command with parsed arguments", async () => {
  const { term, lines } = fakeTerm();
  await makeShell([echo]).run(`echo "a b" c`, term);
  expect(lines).toEqual([{ text: "a b|c", cls: undefined }]);
});

test("reports an unknown command and a parse error", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell([echo]);
  await shell.run("nope", term);
  await shell.run(`echo "x`, term);
  expect(lines).toEqual([
    { text: "luna-sh: command not found: nope", cls: "err" },
    { text: 'luna-sh: unmatched "', cls: "err" },
  ]);
});

test("runs hidden commands but does not complete them", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell([echo, secret]);
  await shell.run("secret", term);
  expect(lines.map((l) => l.text)).toEqual(["found"]);
  expect(shell.complete("se")).toEqual({ line: "se", options: [] });
});

test("completes command names and arguments", () => {
  const shell = makeShell([echo, sub]);
  expect(shell.complete("ec").line).toBe("echo ");
  expect(shell.complete("sub b").line).toBe("sub beta ");
  expect(shell.complete("sub ").options).toEqual(["alpha", "beta"]);
});

test("a command can push a sub-session that pops itself", async () => {
  const { term, stack } = fakeTerm();
  await makeShell([sub]).run("sub", term);
  expect(stack.map((s) => s.prompt)).toEqual(["> "]);
  await stack[0]?.run("quit", term);
  expect(stack).toEqual([]);
});
