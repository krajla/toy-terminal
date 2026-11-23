import { Progress } from "./ctf/progress.ts";
import { YellowMark } from "./fun/yellow-mark.ts";
import type { FsNode } from "./fs/fs.ts";
import { Discoveries } from "./shell/discoveries.ts";
import { Shell, type Command } from "./shell/shell.ts";
import type { Session, TerminalApi } from "./term/types.ts";

const element = () => ({ style: { setProperty() {} }, append() {}, replaceChildren() {}, setAttribute() {}, decode: async () => {} });

// Commands that show a photo or a clip build DOM elements. This stub has the parts they touch.
export function stubDocument() {
  Object.assign(globalThis, { document: { createElement: element, createElementNS: element } });
}

export function memoryStore() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

export function makeShell(commands: Command[], root: FsNode = { kind: "dir", children: {} }) {
  return new Shell(commands, root, new Progress(memoryStore()), new YellowMark(memoryStore()), new Discoveries(memoryStore()));
}

export function fakeTerm() {
  const lines: { text: string; cls?: string }[] = [];
  const stack: Session[] = [];
  const term: TerminalApi = {
    print: (text = "", cls) => void lines.push({ text, cls }),
    printNode: () => {},
    printColumns: (cells) => void lines.push({ text: cells.map((c) => c.text).join(" "), cls: "cols" }),
    printParts: (parts) => void lines.push({ text: parts.map((p) => p.text).join(""), cls: "parts" }),
    live: () => {
      const line: { text: string; cls?: string } = { text: "" };
      lines.push(line);
      return {
        set: (text, cls) => {
          line.text = text;
          line.cls = cls;
        },
        setParts: (parts, cls) => {
          line.text = parts.map((p) => p.text).join("");
          line.cls = cls;
        },
      };
    },
    scene: () => {
      const line: { text: string; cls?: string } = { text: "" };
      lines.push(line);
      return {
        set: (text, cls) => {
          line.text = text;
          line.cls = cls;
        },
        setParts: (parts, cls) => {
          line.text = parts.map((p) => p.text).join("");
          line.cls = cls;
        },
      };
    },
    sleep: async () => {},
    effect: () => {},
    holdView: () => {},
    clear: () => void (lines.length = 0),
    push: (s) => void stack.push(s),
    pop: () => void stack.pop(),
    history: () => [],
  };
  return { term, lines, stack };
}
