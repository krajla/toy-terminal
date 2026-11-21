export class ParseError extends Error {}

export function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inToken = false;
  let quote: '"' | "'" | null = null;

  for (let i = 0; i < line.length; i++) {
    const ch = line.charAt(i);
    if (quote === "'") {
      if (ch === "'") quote = null;
      else current += ch;
    } else if (ch === "\\") {
      const next = line[++i];
      if (next === undefined) throw new ParseError("unexpected end of line after \\");
      current += next;
      inToken = true;
    } else if (quote === '"') {
      if (ch === '"') quote = null;
      else current += ch;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
      inToken = true;
    } else if (/\s/.test(ch)) {
      if (inToken) tokens.push(current);
      current = "";
      inToken = false;
    } else {
      current += ch;
      inToken = true;
    }
  }

  if (quote) throw new ParseError(`unmatched ${quote}`);
  if (inToken) tokens.push(current);
  return tokens;
}
