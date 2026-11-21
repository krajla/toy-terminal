import lunaWasHere from "./home/luna_was_here.txt" with { type: "text" };
import welcome from "./home/welcome.txt" with { type: "text" };
import type { FsNode } from "./fs.ts";

const file = (content: string): FsNode => ({ kind: "file", content });
const dir = (children: Record<string, FsNode>): FsNode => ({ kind: "dir", children });

export const ROOT: FsNode = dir({
  home: dir({
    guest: dir({
      "welcome.txt": file(welcome),
      ".luna_was_here": file(lunaWasHere),
    }),
  }),
});
