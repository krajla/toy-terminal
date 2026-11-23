import type { Command } from "./shell.ts";

export const GITHUB = "https://github.com/krajla";
export const LINKEDIN = "https://www.linkedin.com/in/robert-krajla/";

export const whoami: Command = {
  name: "whoami",
  summary: "who are you",
  run(_args, term) {
    term.print("guest");
    term.print("You are a guest here. Luna is root.", "dim");
  },
};

export const about: Command = {
  name: "about",
  summary: "who is Robert",
  run(_args, term) {
    term.print("Robert Krajla", "amber");
    term.printParts([{ text: "Co-founder and CTO of " }, { text: "inflexa", cls: "amber" }, { text: "." }]);
    term.print();
    term.printParts([
      { text: "Too many hours of League of Legends, fewer now. Deadlock these days (" },
      { text: "gg", cls: "amber" },
      { text: ")." },
    ]);
    term.printParts([
      { text: "TTRPGs with friends: D&D, Heart: The City Beneath, Delta Green, Blades in the Dark (" },
      { text: "roll", cls: "amber" },
      { text: ")." },
    ]);
    term.printParts([
      { text: "Board games: Ark Nova, Arcs, Twilight Imperium 4, Dune: Imperium Uprising (" },
      { text: "play", cls: "amber" },
      { text: "). The spice must flow." },
    ]);
    term.print("Agent harnesses: Claude Code, opencode, Codex.");
    term.print();
    term.printParts([
      { text: "Lives with " },
      { text: "luna", cls: "amber" },
      { text: ", a grey Scottish Fold who runs this machine." },
    ]);
  },
};

export const contact: Command = {
  name: "contact",
  summary: "find Robert",
  run(_args, term) {
    term.printParts([{ text: "github    " }, { text: GITHUB, href: GITHUB }]);
    term.printParts([{ text: "linkedin  " }, { text: LINKEDIN, href: LINKEDIN }]);
    term.print("Luna does not take messages. She takes treats.", "dim");
  },
};

export const inflexa: Command = {
  name: "inflexa",
  summary: "Robert's startup",
  hidden: true,
  run(_args, term) {
    term.print("Inflexa", "amber");
    term.print("Robert is co-founder and CTO.");
    term.print("Luna is not on the payroll. She disputes this.", "dim");
  },
};

const LUNA_MAN = `LUNA(1)                      House Cat Manual                      LUNA(1)

NAME
       luna - grey Scottish Fold, supervisor of this machine

SYNOPSIS
       luna [pose]
       feed luna
       pet luna

DESCRIPTION
       Folded ears, round face, big amber eyes, chunky. Very judgy.
       Sleeps on whatever is warm: laptops, pillows, freshly folded laundry.
       Lies on her back. Slides on her back. Plays with a sardine toy.

FEEDING
       09:00, 15:00 and 21:00. She only eats three times a day,
       and she will tell you about each one.

BUGS
       Knocks things off tables. Sits on keyboards. Wakes up at 03:00
       for zoomies. Will not fix.

SEE ALSO
       sardines(1), submit(1), feed(1), play(6)`;

export const man: Command = {
  name: "man",
  summary: "read a manual",
  run(args, term, shell) {
    const topic = args[0];
    if (!topic) return term.print("What manual page do you want?", "err");
    if (topic === "luna") return term.print(LUNA_MAN);
    const command = shell.visible().find((c) => c.name === topic);
    if (!command) return term.print(`No manual entry for ${topic}`, "err");
    term.print(`${topic.toUpperCase()}(1)`, "amber");
    term.print(`       ${topic} - ${command.summary}`);
    term.print("       That is all the documentation. Luna ate the rest.", "dim");
  },
  complete: (_args, shell) => ["luna", ...shell.visible().map((c) => c.name)],
};

export const ABOUT_COMMANDS: Command[] = [whoami, about, contact, inflexa, man];
