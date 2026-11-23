const WIDTH = 40;

import { sittingCat } from "./cat-art.ts";

const LUNA = ["    \\", "     \\", sittingCat("( o.o )")].join("\n");

function wrap(text: string): string[] {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    if (line && line.length + 1 + word.length > WIDTH) {
      lines.push(line);
      line = "";
    }
    line = line ? `${line} ${word}` : word;
  }
  lines.push(line);
  return lines;
}

export function catsay(text: string): string {
  const lines = wrap(text);
  const width = Math.max(...lines.map((l) => l.length));
  const bar = "-".repeat(width + 2);
  const body =
    lines.length === 1
      ? [`< ${lines[0]} >`]
      : lines.map((l, i) => {
          const [open, close] = i === 0 ? ["/", "\\"] : i === lines.length - 1 ? ["\\", "/"] : ["|", "|"];
          return `${open} ${l.padEnd(width)} ${close}`;
        });
  return [` ${"_".repeat(width + 2)}`, ...body, ` ${bar}`, LUNA].join("\n");
}
