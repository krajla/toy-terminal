import { SARDINES } from "../ctf/sardines.ts";
import type { Output, Part } from "../term/types.ts";

// The start screen: a short menu of the best ways in, and the hunt, which goes past this terminal.
const MENU: [command: string, text: string][] = [
  ["luna", "meet the cat"],
  ["play", "board games, as a cat plays them"],
  ["roll", "throw some dice. Have you seen it?"],
  ["lunagpt", "ask Luna anything"],
];

const WIDTH = 10;
const row = (command: string, text: string): Part[] => [{ text: "  " }, { text: command.padEnd(WIDTH), cls: "amber" }, { text }];

export function intro(term: Output): void {
  term.print("luna.krajla.space", "amber");
  term.print("Robert's terminal. Luna runs it.", "dim");
  term.print();
  for (const [command, text] of MENU) term.printParts(row(command, text));
  term.print();
  term.printParts(row("sardines", `the hunt: Luna hid ${SARDINES.length} sardines, and not only in this terminal.`));
  term.printParts([{ text: " ".repeat(WIDTH + 2) }, { text: "The page, the web and your own tools are all fair game." }]);
  term.printParts([{ text: " ".repeat(WIDTH + 2) }, { text: "Start with " }, { text: "cat welcome.txt", cls: "amber" }, { text: "." }]);
  term.print();
  term.printParts([{ text: "help", cls: "amber" }, { text: " for everything, ", cls: "dim" }, { text: "about", cls: "amber" }, { text: " for who made this. Some things are not listed.", cls: "dim" }]);
  term.print();
}
