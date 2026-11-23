import type { Command } from "../../shell/shell.ts";
import crontab from "./crontab.txt" with { type: "text" };

export const crontabCommand: Command = {
  name: "crontab",
  summary: "show scheduled jobs",
  hidden: true,
  secret: true,
  run(args, term) {
    const flag = args[0];
    if (flag === "-l") return term.print(crontab.trimEnd());
    if (flag === "-e" || flag === "-r") return term.print("crontab: only Robert edits this crontab. Luna is watching.", "err");
    term.print("usage: crontab -l", "dim");
  },
};
