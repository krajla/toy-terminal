// Seals each line of stdin with a phrase: bun scripts/seal.ts <phrase> < secrets.txt
// Prints the sealed text, and the registry check of each line that is a flag, for src/ctf/sardines.ts.
import { checkOf } from "../src/ctf/sardines.ts";
import { seal } from "../src/ctf/seal.ts";

const phrase = process.argv[2];
if (!phrase) throw new Error("usage: bun scripts/seal.ts <phrase> < lines");
for await (const line of console) {
  const text = line.trimEnd();
  if (!text) continue;
  const flag = text.startsWith("sardine{") ? `  check ${await checkOf(text)}` : "";
  console.log(`${await seal(text, phrase)}${flag}`);
}
