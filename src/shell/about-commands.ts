import type { Part } from "../term/types.ts";
import type { Command } from "./shell.ts";

export const GITHUB = "https://github.com/krajla";
export const LINKEDIN = "https://www.linkedin.com/in/robert-krajla/";
export const SOURCE = "https://github.com/krajla/toy-terminal";

export const whoami: Command = {
  name: "whoami",
  summary: "who are you",
  run(_args, term) {
    term.print("guest");
    term.print("You are a guest here. Luna is root.", "dim");
  },
};

const cmd = (text: string): Part => ({ text, cls: "amber" });

export const about: Command = {
  name: "about",
  summary: "who is Robert",
  run(_args, term) {
    term.print("Robert Krajla", "amber");
    term.printParts([{ text: "Co-founder and CTO of " }, cmd("inflexa"), { text: "." }]);
    term.print();
    term.printParts([{ text: "This is an interactive, slightly unhinged terminal about me and my cat, " }, cmd("luna"), { text: "." }]);
    term.print("She is a grey Scottish Fold, and she runs this machine.");
    term.print("It is mostly for my friends and my gaming group, so some jokes are inside jokes.");
    term.print("If you wandered in from somewhere else: welcome. Have a look around.");
    term.print();
    term.printParts([
      { text: "Things to try: " },
      cmd("luna"),
      { text: ", " },
      cmd("play"),
      { text: ", " },
      cmd("roll"),
      { text: ", " },
      cmd("fortune"),
      { text: ", " },
      cmd("lunagpt"),
      { text: ". " },
      cmd("help"),
      { text: " lists the rest. Not every command is listed." },
    ]);
    term.print();
    term.printParts([
      { text: "Luna has also hidden sardines in this machine. Start with " },
      cmd("welcome.txt"),
      { text: ", and count what you find with " },
      cmd("sardines"),
      { text: "." },
    ]);
    term.print();
    term.print("I made this for you. I hope you have some fun, and that it is not terribly difficult.");
    term.print("If you get stuck, persist. Or send me a DM, if you know me.");
    term.printParts([{ text: "source  ", cls: "dim" }, { text: SOURCE, href: SOURCE }]);
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

// No history on this machine. The real one is public, and this points there.
export const git: Command = {
  name: "git",
  summary: "version control",
  hidden: true,
  run(_args, term) {
    term.print("fatal: not a git repository (or any of the parent directories): .git", "err");
    term.print("This machine has no history. Robert keeps his somewhere more public.", "dim");
  },
};

export const ABOUT_COMMANDS: Command[] = [whoami, about, contact, inflexa, man, git];
