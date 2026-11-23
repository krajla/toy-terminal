import lunaWasHere from "./home/luna_was_here.txt" with { type: "text" };
import lunaDb from "./home/luna.db.txt" with { type: "text" };
import welcome from "./home/welcome.txt" with { type: "text" };
import caseFile from "../levels/case-file/case-file.txt" with { type: "text" };
import protocols from "../levels/case-file/protocols.txt" with { type: "text" };
import { NIGHT, NIGHT_POV, type LunaPhoto } from "../luna.ts";
import { MAP_TEXT } from "../levels/overflow/symbols.ts";
import zoomcrypt from "../levels/zoomies/zoomcrypt.go" with { type: "text" };
import zoomiesOld from "../levels/zoomies/zoomies-2026-11-07.log.txt" with { type: "text" };
import zoomiesEnc from "../levels/zoomies/zoomies-2026-11-14.log.enc" with { type: "text" };
import type { FsNode } from "./fs.ts";

const file = (content: string, mtime?: string): FsNode => ({ kind: "file", content, mtime });
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
      bin: dir({
        "zoomcrypt.go": file(zoomcrypt, "Nov 10 22:41"),
      }),
      logs: dir({
        // zoomcrypt writes the .enc file when cron runs it, so its time is the meal after the zoomies.
        "zoomies-2026-11-07.log": file(zoomiesOld, "Nov  7 03:03"),
        "zoomies-2026-11-14.log.enc": file(zoomiesEnc, "Nov 14 09:00"),
      }),
      lunad: dir({
        "lunad.map": file(MAP_TEXT),
      }),
      ".luna_was_here": file(lunaWasHere),
    }),
  }),
});
