import type { Progress } from "../ctf/progress.ts";
import { CASSILDA } from "../fun/king-in-yellow.ts";
import type { YellowMark } from "../fun/yellow-mark.ts";
import { displayPath, HOME, type FsNode } from "../fs/fs.ts";
import { completeWord } from "../term/complete.ts";
import { ParseError, tokenize } from "../term/parse.ts";
import type { Completion, Part, Session, TerminalApi } from "../term/types.ts";

export interface Command {
  name: string;
  summary: string;
  hidden?: boolean;
  run(args: string[], term: TerminalApi, shell: Shell): void | Promise<void>;
  complete?(args: string[], shell: Shell): string[];
}

const SONG_EVERY = 8;

export class Shell implements Session {
  cwd = HOME;
  private readonly commands = new Map<string, Command>();

  constructor(
    commands: Command[],
    readonly root: FsNode,
    readonly progress: Progress,
    readonly mark: YellowMark,
  ) {
    for (const c of commands) this.commands.set(c.name, c);
  }

  private songLine = 0;
  private commandsRun = 0;

  get prompt(): string {
    return `guest@krajla:${displayPath(this.cwd)}$ `;
  }

  promptParts(): Part[] {
    if (!this.mark.has) return [{ text: this.prompt, cls: "prompt" }];
    return [
      { text: "guest@krajla", cls: "prompt" },
      { text: "the Yellow Sign", cls: "sign-mark", img: "/icons/yellow-sign.png" },
      { text: `:${displayPath(this.cwd)}$ `, cls: "prompt" },
    ];
  }

  visible(): Command[] {
    return [...this.commands.values()].filter((c) => !c.hidden).sort((a, b) => a.name.localeCompare(b.name));
  }

  // The marked sing Cassilda's Song: the first input line after a reload, then every eighth one, types the
  // song's next line in place of what the player types.
  possession(): string | undefined {
    if (!this.mark.has || this.commandsRun % SONG_EVERY !== 0) return undefined;
    return CASSILDA[this.songLine % CASSILDA.length];
  }

  async run(line: string, term: TerminalApi): Promise<void> {
    const song = this.possession();
    if (!line.trim()) return;
    this.commandsRun++;
    if (song?.startsWith(line)) {
      this.songLine++;
      return term.print(song, "yellow song");
    }
    let tokens: string[];
    try {
      tokens = tokenize(line);
    } catch (err) {
      if (err instanceof ParseError) return term.print(`luna-sh: ${err.message}`, "err");
      throw err;
    }
    const [name, ...args] = tokens;
    if (name === undefined) return;
    const command = this.commands.get(name);
    if (!command) return term.print(`luna-sh: command not found: ${name}`, "err");
    const wasMarked = this.mark.has;
    await command.run(args, term, this);
    // The song takes over the very next line after the player is marked.
    if (!wasMarked && this.mark.has) {
      this.commandsRun = 0;
      this.songLine = 0;
    }
  }

  complete(line: string): Completion {
    const words = line.split(/\s+/);
    const word = words.pop() ?? "";
    const head = line.slice(0, line.length - word.length);
    const [name, ...args] = words.filter(Boolean);
    const candidates =
      name === undefined
        ? this.visible().map((c) => c.name)
        : (this.commands.get(name)?.complete?.([...args, word], this) ?? []);
    const result = completeWord(word, candidates);
    return { line: head + result.word, options: result.matches };
  }
}
