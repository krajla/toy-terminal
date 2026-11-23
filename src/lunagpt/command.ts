import { displayPath } from "../fs/fs.ts";
import type { Command } from "../shell/shell.ts";
import { LunaGpt } from "./session.ts";
import { welcomeBox } from "./welcome.ts";

export const lunagpt: Command = {
  name: "lunagpt",
  summary: "ask Luna anything",
  run(_args, term, shell) {
    term.printNode(welcomeBox(shell.progress, displayPath(shell.cwd)));
    term.push(new LunaGpt(shell.progress));
  },
};

// Other coding agents and chat bots. In this house, the only agent is the cat.
const RIVALS: Record<string, string> = {
  claude: "Claude is busy writing this website. Luna is not busy. Luna is never busy.",
  codex: "Codex? In this house we ask the cat.",
  gemini: "Gemini sees two of everything. Luna sees everything twice.",
  copilot: "Luna is the pilot. You are the co-pilot. She does not share the controls.",
  cursor: "Luna chases cursors. She does not take orders from them.",
  chatgpt: "That is the other GPT. This house runs on Grey, Purring, Tyrant.",
  gpt: "That is the other GPT. This house runs on Grey, Purring, Tyrant.",
  aider: "Aider is not here. Luna is. She is always here. Especially on the keyboard.",
  opencode: "Nothing is open here. Except the bowl. It is empty.",
  ollama: "No llamas in this house. One cat. Plenty.",
};

export const RIVAL_COMMANDS: Command[] = Object.entries(RIVALS).map(([name, snark]) => ({
  name,
  summary: "another agent",
  hidden: true,
  secret: true,
  run(_args, term) {
    term.print(snark);
    term.printParts([{ text: "Try ", cls: "dim" }, { text: "lunagpt", cls: "amber" }, { text: " instead.", cls: "dim" }]);
  },
}));
