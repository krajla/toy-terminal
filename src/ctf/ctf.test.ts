import { expect, test } from "bun:test";
import { join } from "node:path";
import { CTF_COMMANDS } from "../shell/ctf-commands.ts";
import { fakeTerm, makeShell, memoryStore } from "../test-helpers.ts";
import { Progress } from "./progress.ts";
import { findSardine, proofOf, sardineForProof, SARDINES, sha256Hex } from "./sardines.ts";

const ROOT = join(import.meta.dir, "..", "..");
const FLAG = /sardine\{[a-z0-9_]+\}/g;

// Each easy sardine must be findable in the file that the level points players to.
const EASY_SOURCES: Record<string, string> = {
  welcome: "src/fs/home/welcome.txt",
  dotfile: "src/fs/home/luna_was_here.txt",
  robots: "public/luna-tax-returns/index.html",
  header: "public/_headers",
};

test("each easy sardine sits in its level file and matches its registry check", async () => {
  for (const [id, path] of Object.entries(EASY_SOURCES)) {
    const flags = (await Bun.file(join(ROOT, path)).text()).match(FLAG) ?? [];
    expect(flags).toHaveLength(1);
    expect((await findSardine(flags[0] ?? ""))?.id).toBe(id);
  }
});

test("the registry checks the proof of a flag, not the flag itself", async () => {
  const proof = await proofOf("sardine{w3lc0m3_t0_th3_b0x}");
  expect((await sardineForProof(proof))?.id).toBe("welcome");
  expect(SARDINES.some((s) => s.check === proof)).toBe(false);
  // A plain SHA-256 of a flag, as older commits of the registry hold, is not a proof.
  expect(proof).not.toBe(await sha256Hex("sardine{w3lc0m3_t0_th3_b0x}"));
});

test("registry ids and hashes are unique", () => {
  expect(new Set(SARDINES.map((s) => s.id)).size).toBe(SARDINES.length);
  expect(new Set(SARDINES.map((s) => s.check)).size).toBe(SARDINES.length);
});

test("submit accepts a sardine once and rejects anything else", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(CTF_COMMANDS);
  await shell.run("submit sardine{w3lc0m3_t0_th3_b0x}", term);
  await shell.run("submit sardine{w3lc0m3_t0_th3_b0x}", term);
  await shell.run("submit sardine{nope}", term);
  await shell.run("submit", term);
  expect(lines.map((l) => l.text)).toEqual([
    `Om nom. +1 sardine: the welcome mat. (1/${SARDINES.length})`,
    "You already gave her the welcome mat. She remembers.",
    "Luna sniffs it and walks away. That is not a sardine.",
    "usage: submit sardine{...}",
  ]);
});

test("sardines names only the found ones", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(CTF_COMMANDS);
  shell.progress.add("dotfile", "proof");
  await shell.run("sardines", term);
  expect(lines[1]?.text).toBe(`  easy   1/${SARDINES.filter((s) => s.tier === "easy").length}  the dotfile`);
});

test("progress survives a reload and ignores broken or failing storage", () => {
  const store = memoryStore();
  new Progress(store).add("welcome", "proof");
  expect(new Progress(store).proof("welcome")).toBe("proof");

  store.setItem("krajla.sardines", "{not json");
  expect(new Progress(store).has("welcome")).toBe(false);

  const throwing = {
    getItem: () => {
      throw new Error("blocked");
    },
    setItem: () => {
      throw new Error("blocked");
    },
    removeItem: () => {
      throw new Error("blocked");
    },
  };
  const progress = new Progress(throwing);
  progress.add("welcome", "proof");
  expect(progress.has("welcome")).toBe(true);
});

// Medium and hard flags must never sit in plain text in the source or the static files.
test("only the easy flags appear in plain text in src/ and public/", async () => {
  const glob = new Bun.Glob("{src,public}/**/*.{ts,txt,html,json}");
  const plain = new Set<string>();
  for await (const path of glob.scan(ROOT)) {
    if (path.endsWith(".test.ts")) continue;
    for (const flag of (await Bun.file(join(ROOT, path)).text()).match(FLAG) ?? []) plain.add(flag);
  }
  const headers = (await Bun.file(join(ROOT, "public/_headers")).text()).match(FLAG) ?? [];
  for (const flag of headers) plain.add(flag);
  for (const flag of plain) expect([flag, (await findSardine(flag))?.tier]).toEqual([flag, "easy"]);
});
