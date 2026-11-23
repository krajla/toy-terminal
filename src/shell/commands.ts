import { ABOUT_COMMANDS } from "./about-commands.ts";
import { CTF_COMMANDS } from "./ctf-commands.ts";
import { FS_COMMANDS } from "./fs-commands.ts";
import { LUNA_COMMANDS } from "./luna-commands.ts";
import type { Command } from "./shell.ts";
import { TOY_COMMANDS } from "./toy-commands.ts";
import { sqlite, sqlite3 } from "../levels/sqlite/command.ts";

export const help: Command = {
  name: "help",
  summary: "list commands",
  run(_args, term, shell) {
    const width = Math.max(...shell.visible().map((c) => c.name.length));
    for (const c of shell.visible()) term.print(`  ${c.name.padEnd(width)}  ${c.summary}`);
    term.print();
    term.print("There is a welcome.txt here. Luna did not eat it. Yet.", "dim");
    term.print("Some commands are not on this list. Luna does not tell you everything.", "dim");
  },
};

export const clear: Command = {
  name: "clear",
  summary: "clear the screen",
  run(_args, term) {
    term.clear();
  },
};

export const echo: Command = {
  name: "echo",
  summary: "print text",
  run(args, term) {
    term.print(args.join(" "));
  },
};

// Robert's old session. Later levels add their hints here.
const ROBERTS_HISTORY = ["ls -a", "cat .luna_was_here", "vim .luna_was_here", "feed luna", "feed luna", "man luna", "sudo feed luna", "play ark-nova", "roll 2d6", "sqlite luna.db", "ls archive", "clear"];

export const history: Command = {
  name: "history",
  summary: "show your commands",
  run(_args, term) {
    [...ROBERTS_HISTORY, ...term.history()].forEach((line, i) => term.print(`${String(i + 1).padStart(5)}  ${line}`));
  },
};

export const ALL_COMMANDS: Command[] = [
  help,
  clear,
  echo,
  history,
  ...FS_COMMANDS,
  ...CTF_COMMANDS,
  ...ABOUT_COMMANDS,
  ...LUNA_COMMANDS,
  ...TOY_COMMANDS,
  sqlite,
  sqlite3,
];
