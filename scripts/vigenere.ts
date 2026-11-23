// Enciphers stdin with a Vigenère key: bun scripts/vigenere.ts <key> < plaintext.txt
import { encipher } from "../src/levels/case-file/vigenere.ts";

const key = process.argv[2];
if (!key) throw new Error("usage: bun scripts/vigenere.ts <key> < plaintext");
process.stdout.write(encipher(await Bun.stdin.text(), key));
