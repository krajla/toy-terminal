import { cp, rm } from "node:fs/promises";
import { join } from "node:path";

const ROOT = join(import.meta.dir, "..");
const DIST = join(ROOT, "dist");

await rm(DIST, { recursive: true, force: true });
const result = await Bun.build({ entrypoints: [join(ROOT, "index.html")], outdir: DIST, minify: true, splitting: true });
if (!result.success) {
  for (const log of result.logs) console.error(log);
  process.exit(1);
}
await cp(join(ROOT, "public"), DIST, { recursive: true });
for (const output of result.outputs) console.log(output.path.slice(ROOT.length + 1));
