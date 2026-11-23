import { expect, test } from "bun:test";
import { completePath, displayPath, resolve, type FsNode } from "../fs/fs.ts";
import { fakeTerm, makeShell, stubDocument } from "../test-helpers.ts";
import { FS_COMMANDS } from "./fs-commands.ts";

stubDocument();

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
  await shell.run("ls -a", term);
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
  expect(completePath(ROOT, "/home/guest", "").toSorted()).toEqual(["box/", "notes.txt"]);
  expect(completePath(ROOT, "/home/guest", ".")).toContain(".secret");
  const shell = makeShell(FS_COMMANDS, ROOT);
  expect(shell.complete("cd b").line).toBe("cd box/");
  expect(shell.complete("cat ~/n").line).toBe("cat ~/notes.txt ");
});

const PICTURES: FsNode = {
  kind: "dir",
  children: {
    "a.png": { kind: "image", photo: { name: "a", caption: "A cat.", width: 1, height: 1 }, size: 12345 },
    "notes.txt": { kind: "file", content: "héllo\n" },
    sub: { kind: "dir", children: {} },
  },
};

test("ls -l shows the byte size of each entry", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(FS_COMMANDS, PICTURES);
  shell.cwd = "/";
  await shell.run("ls -l", term);
  await shell.run("ls -l notes.txt", term);
  expect(lines.map((l) => l.text)).toEqual([
    "-rw-r--r-- 1 guest guest 12345 Nov 21 21:34 a.png",
    "-rw-r--r-- 1 guest guest     7 Nov 21 21:34 notes.txt",
    "drwxr-xr-x 1 guest guest  4096 Nov 21 21:34 sub/",
    "-rw-r--r-- 1 guest guest 7 Nov 21 21:34 notes.txt",
  ]);
});

test("view shows a picture with its download link and rejects other files", async () => {
  const { term, lines } = fakeTerm();
  const shell = makeShell(FS_COMMANDS, PICTURES);
  shell.cwd = "/";
  await shell.run("view a.png", term);
  await shell.run("view notes.txt", term);
  await shell.run("cat a.png", term);
  await shell.run("view", term);
  expect(lines.map((l) => l.text)).toEqual([
    "A cat.",
    "download: /luna/a.png",
    "view: notes.txt: not a picture",
    "cat: a.png: binary file, try view",
    "usage: view <picture>",
  ]);
});
