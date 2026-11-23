// Seals the finale message: bun scripts/finale-seal.ts <flags file> < message.txt
// The flags file must be gitignored, for example solvers/FLAGS.txt. Only the hard flags in it are used: their proofs
// make the key. The message and the flags never enter the repository. The output is src/ctf/finale-data.ts.
import { finaleKey, FINALE_IDS } from "../src/ctf/finale.ts";
import { findSardine, proofOf } from "../src/ctf/sardines.ts";
import { toBase64 } from "../src/ctf/seal.ts";

const ITERATIONS = 600_000;

const flagsFile = process.argv[2];
if (!flagsFile) throw new Error("usage: bun scripts/finale-seal.ts <flags file> < message.txt");
const message = (await Bun.stdin.text()).trimEnd();
if (!message) throw new Error("the message on stdin is empty");

const proofs = new Map<string, string>();
for (const flag of (await Bun.file(flagsFile).text()).match(/sardine\{[^}\s]+\}/g) ?? []) {
  const sardine = await findSardine(flag);
  if (sardine && FINALE_IDS.includes(sardine.id)) proofs.set(sardine.id, await proofOf(flag));
}
const missing = FINALE_IDS.filter((id) => !proofs.has(id));
if (missing.length) throw new Error(`the flags file has no flag for: ${missing.join(", ")}`);

const salt = crypto.getRandomValues(new Uint8Array(16));
const iv = crypto.getRandomValues(new Uint8Array(12));
const key = await finaleKey(
  FINALE_IDS.map((id) => proofs.get(id) ?? ""),
  salt,
  ITERATIONS,
);
const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(message)));
const sealed = new Uint8Array(iv.length + data.length);
sealed.set(iv);
sealed.set(data, iv.length);

await Bun.write(
  new URL("../src/ctf/finale-data.ts", import.meta.url),
  `// Written by scripts/finale-seal.ts. The finale message exists here only as ciphertext.
export const FINALE = {
  salt: "${toBase64(salt)}",
  iterations: ${ITERATIONS},
  sealed: "${toBase64(sealed)}",
};
`,
);
console.log(`sealed ${message.length} characters for ${FINALE_IDS.join(", ")}`);
