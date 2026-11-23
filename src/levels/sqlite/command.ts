import { completePath, lookup, resolve } from "../../fs/fs.ts";
import type { Command } from "../../shell/shell.ts";
import { openLunaDb } from "./data.ts";
import { Kiosk, KIOSK_BANNER } from "./kiosk.ts";

export const sqlite: Command = {
  name: "sqlite",
  summary: "open a database",
  hidden: true,
  async run(args, term, shell) {
    const file = args[0];
    if (!file) return term.print("usage: sqlite FILE. There is a database in this home directory.", "dim");
    const node = lookup(shell.root, resolve(shell.cwd, file));
    if (node?.kind !== "file" || !file.endsWith("luna.db")) {
      return term.print(`Error: unable to open database "${file}": unable to open database file`, "err");
    }
    for (const line of KIOSK_BANNER) term.print(line);
    term.push(new Kiosk(await openLunaDb()));
  },
  complete: (args, shell) => completePath(shell.root, shell.cwd, args.at(-1) ?? ""),
};

export const sqlite3: Command = { ...sqlite, name: "sqlite3" };
