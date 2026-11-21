export type FsNode = { kind: "dir"; children: Record<string, FsNode> } | { kind: "file"; content: string };

export const HOME = "/home/guest";

export function resolve(cwd: string, path: string): string {
  const expanded = path === "~" || path.startsWith("~/") ? HOME + path.slice(1) : path;
  const parts = expanded.startsWith("/") ? [] : cwd.split("/").filter(Boolean);
  for (const part of expanded.split("/")) {
    if (part === "..") parts.pop();
    else if (part && part !== ".") parts.push(part);
  }
  return `/${parts.join("/")}`;
}

export function lookup(root: FsNode, abs: string): FsNode | undefined {
  let node: FsNode | undefined = root;
  for (const part of abs.split("/").filter(Boolean)) {
    node = node?.kind === "dir" ? node.children[part] : undefined;
  }
  return node;
}

export function displayPath(abs: string): string {
  if (abs === HOME) return "~";
  return abs.startsWith(`${HOME}/`) ? `~${abs.slice(HOME.length)}` : abs;
}

export function completePath(root: FsNode, cwd: string, word: string): string[] {
  const slash = word.lastIndexOf("/");
  const dirPart = word.slice(0, slash + 1);
  const namePart = word.slice(slash + 1);
  const dir = lookup(root, resolve(cwd, dirPart || "."));
  if (dir?.kind !== "dir") return [];
  return Object.entries(dir.children)
    .filter(([name]) => !name.startsWith(".") || namePart.startsWith("."))
    .map(([name, node]) => dirPart + name + (node.kind === "dir" ? "/" : ""));
}
