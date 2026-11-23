import { expect, test } from "bun:test";
import { SARDINES, sha256Hex } from "../../ctf/sardines.ts";
import { lookup } from "../../fs/fs.ts";
import { ROOT } from "../../fs/tree.ts";
import { ALL_COMMANDS } from "../../shell/commands.ts";
import { fakeTerm, makeShell } from "../../test-helpers.ts";
import { ADDRESS_SARDINE } from "./symbols.ts";

function nameFor(address: bigint): string {
  const bytes = new Uint8Array(8);
  new DataView(bytes.buffer).setBigUint64(0, address, true);
  return "A".repeat(32) + [...bytes].map((b) => `\\x${b.toString(16).padStart(2, "0")}`).join("");
}

async function openDaemon() {
  const root = structuredClone(ROOT);
  const { term, lines, stack } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS, root);
  await shell.run("nc localhost 1337", term);
  const daemon = stack[0];
  if (!daemon) throw new Error("the daemon did not open");
  return { term, lines, stack, daemon, root, shell };
}

test("the leaked map is in the tree and names dispense_sardine", () => {
  const node = lookup(ROOT, "/home/guest/lunad/lunad.map");
  expect(node?.kind === "file" && node.content.includes("dispense_sardine")).toBe(true);
});

test("the default pointer dispenses kibble", async () => {
  const { term, lines, daemon } = await openDaemon();
  await daemon.run("HELP", term);
  await daemon.run("HELLO Luna", term);
  await daemon.run("DISPENSE", term);
  const text = lines.map((l) => l.text).join("\n");
  expect(text).toContain("Hello, Luna.");
  expect(text).toContain("kibble");
  expect(text).not.toContain("sardine{");
});

test("an overflow name points the pointer at dispense_sardine and dispenses the flag", async () => {
  const { term, lines, daemon } = await openDaemon();
  await daemon.run(`HELLO ${nameFor(ADDRESS_SARDINE)}`, term);
  await daemon.run("DISPENSE", term);
  const flag = lines.map((l) => l.text).join("\n").match(/sardine\{[a-z0-9_]+\}/)?.[0] ?? "";
  expect(await sha256Hex(flag)).toBe(SARDINES.find((s) => s.id === "overflow")?.sha256 ?? "missing");
});

test("a wrong address crashes the daemon and writes the crash dump", async () => {
  const { term, lines, stack, daemon, root } = await openDaemon();
  await daemon.run(`HELLO ${nameFor(0xdeadbeefn)}`, term);
  await daemon.run("DISPENSE", term);
  const text = lines.map((l) => l.text).join("\n");
  expect(text).toContain("Segmentation fault (core dumped)");
  expect(stack).toHaveLength(0);
  const dump = lookup(root, "/home/guest/lunad/lunad.core");
  expect(dump?.kind === "file" && dump.content.includes("dispense_sardine")).toBe(true);
});

test("garbage crashes the daemon and writes the crash dump", async () => {
  const { term, stack, daemon, root } = await openDaemon();
  await daemon.run("frobnicate", term);
  expect(stack).toHaveLength(0);
  const dump = lookup(root, "/home/guest/lunad/lunad.core");
  expect(dump?.kind === "file" && dump.content.includes("dispense_sardine")).toBe(true);
});

test("the daemon reconnects after a crash", async () => {
  const { term, stack, daemon, shell } = await openDaemon();
  await daemon.run("frobnicate", term);
  expect(stack).toHaveLength(0);
  await shell.run("nc localhost 1337", term);
  expect(stack).toHaveLength(1);
});

test("the session ends on a wrong HELLO name", async () => {
  const { term, stack, daemon } = await openDaemon();
  await daemon.run("HELLO \\xzz", term);
  expect(stack).toHaveLength(0);
});
