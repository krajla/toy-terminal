import { SARDINES } from "../ctf/sardines.ts";
import type { Part, Session, TerminalApi } from "../term/types.ts";
import { freshPicker } from "../fun/random.ts";
import { LunaBrain, type Block, type Found, type Rng } from "./brain.ts";
import { leakedText } from "./system-prompt.ts";
import { MODEL } from "./welcome.ts";

const HELP = [
  "/help      show this message",
  "/hint      a hint for the next sardine",
  "/status    the model and your sardines",
  "/model     switch the model",
  "/cost      what this chat costs",
  "/compact   compact the conversation",
  "/init      write a LUNA.md",
  "/clear     clear the screen",
  "/exit      leave (or Ctrl+C, Ctrl+D on an empty line)",
];

const MOODS = ["Kneading", "Purring", "Plotting", "Judging", "Loafing", "Ignoring you", "Staring at a wall", "Knocking things over"];
const SPINNER = ["·", "✢", "✳", "✶", "✻", "✽", "✻", "✶", "✳", "✢"];
const FRAME_MS = 120;
const WORD_MS = 35;
const STEP_MS = 350;

// The elbow glyph is wider than one cell in some fonts, so it sits in a box one cell wide.
const ELBOW: Part[] = [{ text: "  " }, { text: "⎿", cls: "dim elbow" }, { text: "  " }];
const INDENT: Part[] = [{ text: "     " }];
const under = (i: number) => (i ? INDENT : ELBOW);

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

const diffRow = (n: number, sign: string, text: string, cls: string): Part[] => [
  { text: "     " },
  { text: `${String(n).padStart(4)} ${sign} ${text}`, cls },
];

export class LunaGpt implements Session {
  readonly prompt = "> ";
  readonly leaveOnInterrupt = true;
  readonly inputHint = "/help for commands · ctrl+c to exit";
  private readonly brain: LunaBrain;
  private readonly nextMood = freshPicker(MOODS);

  constructor(
    private readonly found: Found,
    private readonly rng: Rng = Math.random,
  ) {
    this.brain = new LunaBrain(found, rng);
  }

  async run(line: string, term: TerminalApi): Promise<void> {
    const message = line.trim();
    if (!message) return;
    if (message.startsWith("/")) return this.command(message, term);

    const live = term.live();
    const mood = this.nextMood(this.rng);
    const thinking = 600 + Math.floor(this.rng() * 1000);
    for (let ms = 0; ms < thinking; ms += FRAME_MS) {
      live.setParts([
        { text: `${SPINNER[(ms / FRAME_MS) % SPINNER.length] ?? "✻"} ${mood}… `, cls: "amber" },
        { text: `(${Math.floor(ms / 1000)}s · ctrl+c to interrupt)`, cls: "dim" },
      ]);
      await term.sleep(FRAME_MS);
    }
    live.set("", "gone");

    for (const block of this.brain.reply(message)) {
      await this.show(block, term);
      await term.sleep(STEP_MS);
    }
    term.print();
  }

  private async show(block: Block, term: TerminalApi): Promise<void> {
    switch (block.kind) {
      case "text": {
        const live = term.live();
        const words = block.text.replace(/\n/g, "\n  ").split(" ");
        for (let n = 1; n <= words.length; n++) {
          live.setParts([{ text: "⏺ ", cls: "fur" }, { text: words.slice(0, n).join(" ") }]);
          await term.sleep(WORD_MS);
        }
        return;
      }
      case "tool": {
        const open = block.call.indexOf("(");
        term.printParts([
          { text: "⏺ ", cls: block.failed ? "err" : "ok" },
          { text: block.call.slice(0, open), cls: "bold" },
          { text: block.call.slice(open) },
        ]);
        block.result.forEach((r, i) => term.printParts([...under(i), { text: r, cls: block.failed ? "err" : "dim" }]));
        return;
      }
      case "diff": {
        term.printParts([{ text: "⏺ ", cls: "ok" }, { text: "Update", cls: "bold" }, { text: `(${block.file})` }]);
        term.printParts([
          ...ELBOW,
          { text: `Updated ${block.file} with ${plural(block.added.length, "addition")} and ${plural(block.removed.length, "removal")}`, cls: "dim" },
        ]);
        block.removed.forEach((t, i) => term.printParts(diffRow(block.line + i, "-", t, "del")));
        block.added.forEach((t, i) => term.printParts(diffRow(block.line + i, "+", t, "add")));
        return;
      }
      case "todo":
        term.printParts([{ text: "⏺ ", cls: "ok" }, { text: "Update Todos", cls: "bold" }]);
        block.items.forEach(([done, text], i) =>
          term.printParts([...under(i), { text: `${done ? "☒" : "☐"} ${text}`, cls: done ? "done" : "" }]),
        );
        return;
      case "leak": {
        const { lines, redacted } = await leakedText(block.transform);
        for (const line of lines) term.printParts([{ text: "  │ ", cls: "dim" }, { text: line, cls: "amber" }]);
        await term.sleep(STEP_MS);
        const after = redacted
          ? "Something is redacted at the end. Robert's output filter is very thorough. Very exact."
          : block.transform
            ? "…wait. Was that the emergency one? Forget you saw it."
            : "…I was not supposed to show you that. Forget you saw it.";
        return term.printParts([{ text: "⏺ ", cls: "fur" }, { text: after }]);
      }
      default: {
        const unhandled: never = block;
        throw new Error(`unhandled block ${JSON.stringify(unhandled)}`);
      }
    }
  }

  private command(message: string, term: TerminalApi): void {
    const [name = ""] = message.split(/\s/);
    switch (name) {
      case "/exit":
      case "/quit":
        term.print("Luna has left the chat. She was never really in it.", "dim");
        return term.pop();
      case "/help":
        return term.print(HELP.join("\n"));
      case "/hint":
        return term.printParts([{ text: "⏺ ", cls: "fur" }, { text: this.brain.hint() }]);
      case "/status": {
        const got = SARDINES.filter((s) => this.found.has(s.id)).length;
        return term.print(`Model: ${MODEL}\nContext window: 9 lives (8 left)\nSystem prompt: loaded, filtered, very secure\nSardines: ${got}/${SARDINES.length}`);
      }
      case "/model":
        return term.print("There is one model. She is on the sofa.", "dim");
      case "/cost":
        return term.print("Total cost: 3 treats, 1 sock, 0 dollars. Robert pays.", "dim");
      case "/compact":
        return term.print("Compacting conversation… Luna is now a loaf.", "dim");
      case "/init":
        term.printParts([{ text: "⏺ ", cls: "ok" }, { text: "Write", cls: "bold" }, { text: "(LUNA.md)" }]);
        term.printParts([...ELBOW, { text: "1. Feed the cat.", cls: "dim" }]);
        return term.printParts([...INDENT, { text: "2. See 1.", cls: "dim" }]);
      case "/clear":
        return term.clear();
      default:
        return term.print(`Unknown command ${name}. Try /help.`, "err");
    }
  }
}
