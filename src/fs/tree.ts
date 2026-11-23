import lunaWasHere from "./home/luna_was_here.txt" with { type: "text" };
import lunaDb from "./home/luna.db.txt" with { type: "text" };
import welcome from "./home/welcome.txt" with { type: "text" };
import caseFile from "../levels/case-file/case-file.txt" with { type: "text" };
import protocols from "../levels/case-file/protocols.txt" with { type: "text" };
import { NIGHT, NIGHT_POV, type LunaPhoto } from "../luna.ts";
import type { FsNode } from "./fs.ts";

const file = (content: string): FsNode => ({ kind: "file", content });
const dir = (children: Record<string, FsNode>): FsNode => ({ kind: "dir", children });
// The size is the byte count of the PNG in public/luna/, so that `ls -l` shows the real file.
const image = (photo: LunaPhoto, size: number): FsNode => ({ kind: "image", photo, size });

export const ROOT: FsNode = dir({
  home: dir({
    guest: dir({
      "welcome.txt": file(welcome),
      "luna.db": file(lunaDb),
      archive: dir({
        "case_file_GREY-FOLD.txt": file(caseFile),
        ".protocols": file(protocols),
      }),
      pictures: dir({
        "night.png": image(NIGHT, 3772),
        "night_luna_pov.png": image(NIGHT_POV, 3875),
      }),
      ".luna_was_here": file(lunaWasHere),
    }),
  }),
});
