import { expect, test } from "bun:test";
import { join } from "node:path";
import type { FsNode } from "./fs.ts";
import { ROOT } from "./tree.ts";

function images(node: FsNode): Extract<FsNode, { kind: "image" }>[] {
  if (node.kind === "image") return [node];
  return node.kind === "dir" ? Object.values(node.children).flatMap(images) : [];
}

test("each picture in the tree has the size of its PNG", async () => {
  const found = images(ROOT);
  expect(found.length).toBeGreaterThan(0);
  for (const node of found) {
    expect(Bun.file(join(import.meta.dir, "..", "..", "public", "luna", `${node.photo.name}.png`)).size).toBe(node.size);
  }
});
