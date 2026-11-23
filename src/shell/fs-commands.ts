import { completePath, HOME, lookup, resolve } from "../fs/fs.ts";
import type { Cell, Part } from "../term/types.ts";
import type { Command, Shell } from "./shell.ts";

const completeLast = (args: string[], shell: Shell) => completePath(shell.root, shell.cwd, args.at(-1) ?? "");

export const ls: Command = {
  name: "ls",
  summary: "list files",
  run(args, term, shell) {
    const all = args.some((a) => /^-[a-zA-Z]*a/.test(a));
    const paths = args.filter((a) => !a.startsWith("-"));
    for (const path of paths.length ? paths : ["."]) {
      const node = lookup(shell.root, resolve(shell.cwd, path));
      if (!node) {
        term.print(`ls: cannot access '${path}': No such file or directory`, "err");
        continue;
      }
      if (node.kind === "file") {
        term.print(path);
        continue;
      }
      if (paths.length > 1) term.print(`${path}:`);
      const cells: Cell[] = Object.entries(node.children)
        .filter(([name]) => all || !name.startsWith("."))
        .sort(([a], [b]) => a.replace(/^\./, "").localeCompare(b.replace(/^\./, "")))
        .map(([name, child]) => (child.kind === "dir" ? { text: `${name}/`, cls: "blue" } : { text: name }));
      if (all) cells.unshift({ text: "./", cls: "blue" }, { text: "../", cls: "blue" });
      if (cells.length) term.printColumns(cells);
    }
  },
  complete: completeLast,
};

export const cd: Command = {
  name: "cd",
  summary: "change directory",
  run(args, term, shell) {
    const path = args[0] ?? HOME;
    const target = resolve(shell.cwd, path);
    const node = lookup(shell.root, target);
    if (!node) return term.print(`cd: no such file or directory: ${path}`, "err");
    if (node.kind !== "dir") return term.print(`cd: not a directory: ${path}`, "err");
    shell.cwd = target;
  },
  complete: (args, shell) => completeLast(args, shell).filter((p) => p.endsWith("/")),
};

export const pwd: Command = {
  name: "pwd",
  summary: "print working directory",
  run(_args, term, shell) {
    term.print(shell.cwd);
  },
};

// A file can mark a sloppy redaction as ⟦text⟧: it shows as a solid bar, but the text is still there,
// so selecting or copying it reveals the words, as with a badly redacted PDF.
export function redactions(content: string): Part[] {
  return content.split(/⟦([^⟧]*)⟧/).map((text, i) => (i % 2 ? { text, cls: "leaky" } : { text }));
}

export const cat: Command = {
  name: "cat",
  summary: "print a file",
  run(args, term, shell) {
    if (!args.length) return term.print("cat: missing file operand", "err");
    for (const path of args) {
      const node = lookup(shell.root, resolve(shell.cwd, path));
      if (!node) term.print(`cat: ${path}: No such file or directory`, "err");
      else if (node.kind === "dir") term.print(`cat: ${path}: Is a directory`, "err");
      else term.printParts(redactions(node.content.replace(/\n$/, "")));
    }
  },
  complete: completeLast,
};

export const FS_COMMANDS: Command[] = [ls, cd, pwd, cat];
