import { expect, test } from "bun:test";
import { findSardine } from "../../ctf/sardines.ts";
import { lookup, type FsNode } from "../../fs/fs.ts";
import { ROOT } from "../../fs/tree.ts";
import { ALL_COMMANDS } from "../../shell/commands.ts";
import { fakeTerm, makeShell } from "../../test-helpers.ts";
import { ADDRESS_SARDINE } from "./symbols.ts";

function nameFor(address: number): string {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, address, true);
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
  expect((await findSardine(flag))?.id).toBe("overflow");
});

test("a wrong address crashes the daemon and writes the crash dump", async () => {
  const { term, lines, stack, daemon, root } = await openDaemon();
  await daemon.run(`HELLO ${nameFor(0xdeadbeef)}`, term);
  await daemon.run("DISPENSE", term);
  const text = lines.map((l) => l.text).join("\n");
  expect(text).toContain("Segmentation fault (core dumped)");
  expect(stack).toHaveLength(0);
  expect(crashLog(root)).toContain("eip            0xdeadbeef          0xdeadbeef");
});

function crashLog(root: FsNode): string {
  const node = lookup(root, "/home/guest/lunad/crash.log");
  return node?.kind === "file" ? node.content : "";
}

test("the crash log shows a long name running into the pointer, but not where dispense_sardine is", async () => {
  const { term, daemon, root } = await openDaemon();
  await daemon.run(`HELLO ${"A".repeat(50)}`, term);
  await daemon.run("DISPENSE", term);
  const log = crashLog(root);
  expect(log).toContain("0x41414141 in ?? ()");
  expect(log).toContain("0xffffd5e0:\t0x41414141");
  expect(log).not.toContain("dispense_sardine");
});

// The pattern of Metasploit's pattern_create, which wiremask and most offset tools use.
function pattern(length: number): string {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  let out = "";
  for (const a of upper) for (const b of lower) for (const c of "0123456789") if (out.length < length) out += a + b + c;
  return out.slice(0, length);
}

test("the eip in the crash log gives offset 32 in a pattern tool", async () => {
  const { term, daemon, root } = await openDaemon();
  const sent = pattern(60);
  await daemon.run(`HELLO ${sent}`, term);
  await daemon.run("DISPENSE", term);
  const eip = parseInt(crashLog(root).match(/^eip\s+0x([0-9a-f]{8})/m)?.[1] ?? "0", 16);
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, eip, true);
  expect(sent.indexOf(new TextDecoder().decode(bytes))).toBe(32);
});

test("typos get an error and keep the session open", async () => {
  const { term, lines, stack, daemon } = await openDaemon();
  await daemon.run("frobnicate", term);
  await daemon.run("HELLO \\xzz", term);
  expect(stack).toHaveLength(1);
  expect(lines.slice(-2).map((l) => l.text)).toEqual(['ERR unknown command "frobnicate". Try HELP.', "ERR bad escape. Write a byte as \\x followed by two hex digits."]);
});

test("the daemon reconnects after a crash", async () => {
  const { term, stack, daemon, shell } = await openDaemon();
  await daemon.run(`HELLO ${nameFor(0xdeadbeef)}`, term);
  await daemon.run("DISPENSE", term);
  expect(stack).toHaveLength(0);
  await shell.run("nc localhost 1337", term);
  expect(stack).toHaveLength(1);
});
