import { expect, test } from "bun:test";
import { findSardine } from "../../ctf/sardines.ts";
import { lookup } from "../../fs/fs.ts";
import { ROOT } from "../../fs/tree.ts";
import { ALL_COMMANDS } from "../../shell/commands.ts";
import { redactions } from "../../shell/fs-commands.ts";
import { fakeTerm, makeShell } from "../../test-helpers.ts";
import { decipher, encipher } from "./vigenere.ts";

const PATH = "/home/guest/archive/case_file_GREY-FOLD.txt";

test("Vigenère keeps case and punctuation, and moves the key on letters only", () => {
  expect(encipher("Attack at dawn!", "LEMON")).toBe("Lxfopv ef rnhr!");
  expect(decipher(encipher("sardine{a1_b}", "KEY"), "KEY")).toBe("sardine{a1_b}");
});

test("a sloppy redaction keeps its text in a part of its own", () => {
  expect(redactions("CODE ⟦SECRET⟧ ███")).toEqual([{ text: "CODE " }, { text: "SECRET", cls: "leaky" }, { text: " ███" }]);
});

test("the solve: the leaked codename deciphers Appendix C to the sardine", async () => {
  const node = lookup(ROOT, PATH);
  if (node?.kind !== "file") throw new Error("the case file is missing");
  const leaked = redactions(node.content).filter((p) => p.cls === "leaky").map((p) => p.text);
  expect(leaked).toHaveLength(1);
  const appendix = node.content.slice(node.content.indexOf("protocol 7.")).split("\n").slice(2).join("\n");
  const flag = decipher(appendix, leaked[0] ?? "").match(/sardine\{[a-z0-9_]+\}/)?.[0] ?? "";
  expect((await findSardine(flag))?.id).toBe("case-file");
});

test("the cipher is only named in the hidden protocols file next to the case file", () => {
  const caseFile = lookup(ROOT, PATH);
  const protocols = lookup(ROOT, "/home/guest/archive/.protocols");
  expect(caseFile?.kind === "file" && caseFile.content.includes("Vigen")).toBe(false);
  expect(protocols?.kind === "file" && protocols.content.includes("Vigenère")).toBe(true);
});

test("the archive is in the home directory, and cat prints the case file", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(ALL_COMMANDS, ROOT);
  await shell.run("ls", term);
  await shell.run("cat archive/case_file_GREY-FOLD.txt", term);
  expect(lines[0]?.text).toContain("archive/");
  expect(lines[1]?.text).toStartWith("TOP SECRET // DELTA GREEN // ORCON");
});
