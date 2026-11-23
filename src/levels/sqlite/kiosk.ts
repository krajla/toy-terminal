import { completeWord } from "../../term/complete.ts";
import type { Completion, Session, TerminalApi } from "../../term/types.ts";
import { execute, formatError, SQLITE_VERSION, SqlError, type Database, type ResultSet } from "./engine.ts";

const DOT_COMMANDS = [".help", ".treat", ".quit", ".exit"];
const LOCKED = new Set([".tables", ".schema", ".dump", ".databases", ".open", ".read", ".shell", ".system", ".mode"]);

// The kiosk claims each lookup is parameterised. It is not: it pastes the player's text into the query.
export function treatQuery(name: string): string {
  return `SELECT name, kcal, rating FROM treats WHERE name = '${name}'`;
}

function table(result: ResultSet): string {
  const cells = [result.columns, ...result.rows.map((r) => r.map((v) => (v === null ? "" : String(v))))];
  const widths = result.columns.map((_, i) => Math.max(...cells.map((row) => (row[i] ?? "").length)));
  const line = (row: string[]) => row.map((v, i) => v.padEnd(widths[i] ?? 0)).join("  ").trimEnd();
  const [header = [], ...body] = cells;
  return [line(header), line(widths.map((w) => "-".repeat(w))), ...body.map(line)].join("\n");
}

export const KIOSK_BANNER = [
  `SQLite version ${SQLITE_VERSION} (Luna's kiosk edition)`,
  "Read-only kiosk. Raw SQL is disabled by Luna.",
  "Look up a treat with .treat <name>. Every lookup is parameterised and totally safe.",
  'Enter ".help" for usage hints.',
];

export class Kiosk implements Session {
  readonly prompt = "sqlite> ";

  constructor(private readonly db: Database) {}

  run(line: string, term: TerminalApi): void {
    const trimmed = line.trim();
    if (!trimmed) return;
    const [word = ""] = trimmed.split(/\s+/);
    if (word === ".quit" || word === ".exit") return term.pop();
    if (word === ".help") {
      term.print('.help            Show this message\n.treat NAME      Look up a treat by name\n.quit            Leave the kiosk (or Ctrl+D)');
      return;
    }
    if (word === ".treat") {
      const name = line.slice(line.indexOf(".treat") + ".treat".length).replace(/^ /, "");
      const sql = treatQuery(name);
      try {
        const result = execute(this.db, sql);
        if (result.rows.length) term.print(table(result));
        else term.print("(no treat by that name. Luna is disappointed.)", "dim");
      } catch (err) {
        if (!(err instanceof SqlError)) throw err;
        term.print(formatError(sql, err), "err");
      }
      return;
    }
    if (LOCKED.has(word)) return term.print(`Error: ${word} is disabled in kiosk mode. Luna is watching.`, "err");
    if (word.startsWith(".")) {
      return term.print(`Error: unknown command or invalid arguments:  "${word.slice(1)}". Enter ".help" for help`, "err");
    }
    term.print("Error: raw SQL is disabled in kiosk mode. Luna says: use .treat <name>", "err");
  }

  complete(line: string): Completion {
    if (line.startsWith(".treat ")) {
      const word = line.slice(".treat ".length);
      const names = (this.db.treats?.rows ?? []).map((r) => String(r[0]));
      const result = completeWord(word, names);
      return { line: `.treat ${result.word}`.trimEnd(), options: result.matches };
    }
    const result = completeWord(line, DOT_COMMANDS);
    return { line: result.word, options: result.matches };
  }
}
