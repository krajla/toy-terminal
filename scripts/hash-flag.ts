// Prints the registry check of each flag on stdin, for the `check` field in src/ctf/sardines.ts.
import { checkOf } from "../src/ctf/sardines.ts";

for (const line of (await Bun.stdin.text()).split("\n")) {
  const flag = line.trim();
  if (flag) console.log(await checkOf(flag));
}
