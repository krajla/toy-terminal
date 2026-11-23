// Prints the SHA-256 of each line on stdin, for the sardine registry in src/ctf/sardines.ts.
for (const line of (await Bun.stdin.text()).split("\n")) {
  const flag = line.trim();
  if (flag) console.log(new Bun.CryptoHasher("sha256").update(flag).digest("hex"));
}
