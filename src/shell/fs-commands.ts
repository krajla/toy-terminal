import { completePath, HOME, lookup, resolve, type FsNode } from "../fs/fs.ts";
import { photo } from "../luna.ts";
import type { Cell, Part } from "../term/types.ts";
import type { Command, Shell } from "./shell.ts";

const completeLast = (args: string[], shell: Shell) => completePath(shell.root, shell.cwd, args.at(-1) ?? "");

const MTIME = "Nov 21 21:34";

function size(node: FsNode): number {
  if (node.kind === "dir") return 4096;
  if (node.kind === "file") return new TextEncoder().encode(node.content).length;
  return node.size;
}

function longLine(name: string, node: FsNode, width: number): Part[] {
  const isDir = node.kind === "dir";
  const mtime = node.kind === "file" ? (node.mtime ?? MTIME) : MTIME;
  const meta = `${isDir ? "drwxr-xr-x" : "-rw-r--r--"} 1 guest guest ${String(size(node)).padStart(width)} ${mtime} `;
  return [{ text: meta }, isDir ? { text: `${name}/`, cls: "blue" } : { text: name }];
}

export const ls: Command = {
  name: "ls",
  summary: "list files",
  run(args, term, shell) {
    const all = args.some((a) => /^-[a-zA-Z]*a/.test(a));
    const long = args.some((a) => /^-[a-zA-Z]*l/.test(a));
    const paths = args.filter((a) => !a.startsWith("-"));
    for (const path of paths.length ? paths : ["."]) {
      const node = lookup(shell.root, resolve(shell.cwd, path));
      if (!node) {
        term.print(`ls: cannot access '${path}': No such file or directory`, "err");
        continue;
      }
      if (node.kind !== "dir") {
        if (long) term.printParts(longLine(path, node, String(size(node)).length));
        else term.print(path);
        continue;
      }
      if (paths.length > 1) term.print(`${path}:`);
      const entries = Object.entries(node.children)
        .filter(([name]) => all || !name.startsWith("."))
        .toSorted(([a], [b]) => a.replace(/^\./, "").localeCompare(b.replace(/^\./, "")));
      if (long) {
        if (all) entries.unshift([".", node], ["..", node]);
        const width = Math.max(0, ...entries.map(([, child]) => String(size(child)).length));
        for (const [name, child] of entries) term.printParts(longLine(name, child, width));
        continue;
      }
      const cells: Cell[] = entries.map(([name, child]) => (child.kind === "dir" ? { text: `${name}/`, cls: "blue" } : { text: name }));
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
      else if (node.kind === "image") term.print(`cat: ${path}: binary file, try view`, "err");
      else term.printParts(redactions(node.content.replace(/\n$/, "")));
    }
  },
  complete: completeLast,
};

export const view: Command = {
  name: "view",
  summary: "show a picture",
  run(args, term, shell) {
    const path = args[0];
    if (!path) return term.print("usage: view <picture>", "err");
    const node = lookup(shell.root, resolve(shell.cwd, path));
    if (!node) return term.print(`view: ${path}: No such file or directory`, "err");
    if (node.kind !== "image") return term.print(`view: ${path}: not a picture`, "err");
    const url = `/luna/${node.photo.name}.png`;
    term.printNode(photo(node.photo));
    term.print(node.photo.caption, "dim");
    term.printParts([{ text: "download: " }, { text: url, href: url }]);
  },
  complete: completeLast,
};

export const FS_COMMANDS: Command[] = [ls, cd, pwd, cat, view];
