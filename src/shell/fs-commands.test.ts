import { expect, test } from "bun:test";
import { completePath, displayPath, resolve, type FsNode } from "../fs/fs.ts";
import { fakeTerm, makeShell } from "../test-helpers.ts";
import { FS_COMMANDS } from "./fs-commands.ts";

const ROOT: FsNode = {
  kind: "dir",
  children: {
    home: {
      kind: "dir",
      children: {
        guest: {
          kind: "dir",
          children: {
            "notes.txt": { kind: "file", content: "hello\n" },
            ".secret": { kind: "file", content: "shh\n" },
            box: { kind: "dir", children: {} },
          },
        },
      },
    },
  },
};

test("resolve normalizes relative, home and parent paths", () => {
  expect(resolve("/home/guest", "box/../notes.txt")).toBe("/home/guest/notes.txt");
  expect(resolve("/", "~/box")).toBe("/home/guest/box");
  expect(resolve("/home", "../../..")).toBe("/");
  expect(displayPath("/home/guest/box")).toBe("~/box");
  expect(displayPath("/home")).toBe("/home");
});

test("ls hides dotfiles unless -a is given", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(FS_COMMANDS, ROOT);
  await shell.run("ls", term);
  await shell.run("ls -la", term);
  expect(lines.map((l) => l.text)).toEqual(["box/ notes.txt", "./ ../ box/ notes.txt .secret"]);
});

test("cd changes the prompt and rejects files and missing paths", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(FS_COMMANDS, ROOT);
  await shell.run("cd box", term);
  expect(shell.prompt).toBe("guest@krajla:~/box$ ");
  await shell.run("cd ../notes.txt", term);
  await shell.run("cd nope", term);
  await shell.run("cd", term);
  expect(shell.cwd).toBe("/home/guest");
  expect(lines.map((l) => l.text)).toEqual(["cd: not a directory: ../notes.txt", "cd: no such file or directory: nope"]);
});

test("cat prints files and reports directories and missing files", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(FS_COMMANDS, ROOT);
  await shell.run("cat .secret box nope", term);
  expect(lines.map((l) => l.text)).toEqual(["shh", "cat: box: Is a directory", "cat: nope: No such file or directory"]);
});

test("path completion hides dotfiles until the word starts with a dot", () => {
  expect(completePath(ROOT, "/home/guest", "").sort()).toEqual(["box/", "notes.txt"]);
  expect(completePath(ROOT, "/home/guest", ".")).toContain(".secret");
  const shell = makeShell(FS_COMMANDS, ROOT);
  expect(shell.complete("cd b").line).toBe("cd box/");
  expect(shell.complete("cat ~/n").line).toBe("cat ~/notes.txt ");
});
