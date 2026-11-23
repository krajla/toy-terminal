// A small SQL engine for the luna.db kiosk. It covers what the injection level needs: SELECT with WHERE, UNION,
// ORDER BY and LIMIT, comments, and a few functions. Its errors copy the text and caret layout of the SQLite 3.44
// command-line shell, because those errors are how a player learns the shape of the hidden query.

export type Value = string | number | null;

export interface Table {
  columns: string[];
  rows: Value[][];
}

export type Database = Record<string, Table>;

export interface ResultSet {
  columns: string[];
  rows: Value[][];
}

export class SqlError extends Error {
  constructor(
    message: string,
    /** Character offset in the SQL text that the caret points at. */
    readonly at: number,
  ) {
    super(message);
  }
}

type TokenKind = "word" | "string" | "number" | "op" | "end";

interface Token {
  kind: TokenKind;
  text: string;
  at: number;
}

const OPERATORS = ["<=", ">=", "<>", "!=", "==", "||", "=", "<", ">", "(", ")", ",", "*", ";", "+", "-"];

export function tokenize(sql: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < sql.length) {
    const ch = sql.charAt(i);
    if (/\s/.test(ch)) {
      i++;
    } else if (sql.startsWith("--", i)) {
      const end = sql.indexOf("\n", i);
      i = end < 0 ? sql.length : end;
    } else if (sql.startsWith("/*", i)) {
      const end = sql.indexOf("*/", i + 2);
      i = end < 0 ? sql.length : end + 2;
    } else if (ch === "'") {
      let text = "";
      let j = i + 1;
      for (;;) {
        if (j >= sql.length) throw new SqlError(`unrecognized token: "${sql.slice(i)}"`, i);
        if (sql.charAt(j) === "'") {
          if (sql.charAt(j + 1) === "'") {
            text += "'";
            j += 2;
            continue;
          }
          break;
        }
        text += sql.charAt(j++);
      }
      tokens.push({ kind: "string", text, at: i });
      i = j + 1;
    } else if (ch === '"') {
      const end = sql.indexOf('"', i + 1);
      if (end < 0) throw new SqlError(`unrecognized token: "${sql.slice(i)}"`, i);
      tokens.push({ kind: "word", text: sql.slice(i + 1, end), at: i });
      i = end + 1;
    } else if (/[0-9]/.test(ch)) {
      const m = /^[0-9]+(\.[0-9]+)?/.exec(sql.slice(i));
      const text = m?.[0] ?? ch;
      tokens.push({ kind: "number", text, at: i });
      i += text.length;
    } else if (/[A-Za-z_]/.test(ch)) {
      const m = /^[A-Za-z_][A-Za-z0-9_]*/.exec(sql.slice(i));
      const text = m?.[0] ?? ch;
      tokens.push({ kind: "word", text, at: i });
      i += text.length;
    } else {
      const op = OPERATORS.find((o) => sql.startsWith(o, i));
      if (!op) throw new SqlError(`unrecognized token: "${ch}"`, i);
      tokens.push({ kind: "op", text: op, at: i });
      i += op.length;
    }
  }
  tokens.push({ kind: "end", text: "", at: sql.length });
  return tokens;
}

type Expr =
  | { kind: "literal"; value: Value }
  | { kind: "column"; name: string; at: number }
  | { kind: "unary"; op: "NOT" | "-"; arg: Expr }
  | { kind: "binary"; op: string; left: Expr; right: Expr }
  | { kind: "call"; name: string; args: Expr[]; at: number };

interface ResultColumn {
  expr: Expr | "*";
  name: string;
}

interface Select {
  columns: ResultColumn[];
  from?: { name: string; at: number };
  where?: Expr;
  at: number;
}

interface Query {
  selects: Select[];
  unionAt: number[];
  orderBy?: { expr: Expr; desc: boolean };
  limit?: number;
}

const KEYWORDS = new Set([
  "SELECT", "FROM", "WHERE", "UNION", "ALL", "ORDER", "BY", "LIMIT", "AND", "OR", "NOT", "AS", "ASC", "DESC", "LIKE",
  "NULL", "DISTINCT",
]);

class Parser {
  private i = 0;
  private readonly end: Token;

  constructor(private readonly tokens: Token[]) {
    this.end = tokens.at(-1) ?? { kind: "end", text: "", at: 0 };
  }

  private get tok(): Token {
    return this.tokens[this.i] ?? this.end;
  }

  private isWord(word: string): boolean {
    return this.tok.kind === "word" && this.tok.text.toUpperCase() === word;
  }

  private isOp(op: string): boolean {
    return this.tok.kind === "op" && this.tok.text === op;
  }

  private fail(): never {
    if (this.tok.kind === "end") throw new SqlError("incomplete input", this.tok.at);
    throw new SqlError(`near "${this.tok.text}": syntax error`, this.tok.at);
  }

  private expectWord(word: string): void {
    if (!this.isWord(word)) this.fail();
    this.i++;
  }

  private expectOp(op: string): void {
    if (!this.isOp(op)) this.fail();
    this.i++;
  }

  query(): Query {
    const selects = [this.select()];
    const unionAt: number[] = [];
    while (this.isWord("UNION")) {
      unionAt.push(this.tok.at);
      this.i++;
      if (this.isWord("ALL")) this.i++;
      selects.push(this.select());
    }
    const query: Query = { selects, unionAt };
    if (this.isWord("ORDER")) {
      this.i++;
      this.expectWord("BY");
      const expr = this.expr();
      let desc = false;
      if (this.isWord("DESC")) {
        desc = true;
        this.i++;
      } else if (this.isWord("ASC")) this.i++;
      query.orderBy = { expr, desc };
    }
    if (this.isWord("LIMIT")) {
      this.i++;
      if (this.tok.kind !== "number") this.fail();
      query.limit = Number(this.tok.text);
      this.i++;
    }
    if (this.isOp(";")) {
      this.i++;
      if (this.tok.kind !== "end") throw new SqlError("You can only execute one statement at a time.", this.tok.at);
    }
    if (this.tok.kind !== "end") this.fail();
    return query;
  }

  private select(): Select {
    const at = this.tok.at;
    this.expectWord("SELECT");
    if (this.isWord("DISTINCT")) this.i++;
    const columns: ResultColumn[] = [];
    do {
      if (columns.length) this.i++;
      if (this.isOp("*")) {
        this.i++;
        columns.push({ expr: "*", name: "*" });
        continue;
      }
      const start = this.tok;
      const expr = this.expr();
      let name = expr.kind === "column" ? expr.name : this.sourceText(start);
      // An alias, with or without AS, as SQLite allows: SELECT name AS n, SELECT name n.
      if (this.isWord("AS")) {
        this.i++;
        if (this.tok.kind !== "word") this.fail();
      }
      if (this.tok.kind === "word" && !KEYWORDS.has(this.tok.text.toUpperCase())) {
        name = this.tok.text;
        this.i++;
      }
      columns.push({ expr, name });
    } while (this.isOp(","));
    const select: Select = { columns, at };
    if (this.isWord("FROM")) {
      this.i++;
      if (this.tok.kind !== "word" || KEYWORDS.has(this.tok.text.toUpperCase())) this.fail();
      select.from = { name: this.tok.text, at: this.tok.at };
      this.i++;
    }
    if (this.isWord("WHERE")) {
      this.i++;
      select.where = this.expr();
    }
    return select;
  }

  private sourceText(start: Token): string {
    return start.kind === "string" ? `'${start.text}'` : start.text;
  }

  private expr(): Expr {
    let left = this.and();
    while (this.isWord("OR")) {
      this.i++;
      left = { kind: "binary", op: "OR", left, right: this.and() };
    }
    return left;
  }

  private and(): Expr {
    let left = this.not();
    while (this.isWord("AND")) {
      this.i++;
      left = { kind: "binary", op: "AND", left, right: this.not() };
    }
    return left;
  }

  private not(): Expr {
    if (this.isWord("NOT")) {
      this.i++;
      return { kind: "unary", op: "NOT", arg: this.not() };
    }
    return this.comparison();
  }

  private comparison(): Expr {
    const left = this.concat();
    for (const op of ["=", "==", "!=", "<>", "<", ">", "<=", ">="]) {
      if (this.isOp(op)) {
        this.i++;
        return { kind: "binary", op: op === "==" ? "=" : op === "<>" ? "!=" : op, left, right: this.concat() };
      }
    }
    if (this.isWord("LIKE")) {
      this.i++;
      return { kind: "binary", op: "LIKE", left, right: this.concat() };
    }
    return left;
  }

  private concat(): Expr {
    let left = this.additive();
    while (this.isOp("||")) {
      this.i++;
      left = { kind: "binary", op: "||", left, right: this.additive() };
    }
    return left;
  }

  private additive(): Expr {
    let left = this.unary();
    while (this.isOp("+") || this.isOp("-")) {
      const op = this.tok.text;
      this.i++;
      left = { kind: "binary", op, left, right: this.unary() };
    }
    return left;
  }

  private unary(): Expr {
    if (this.isOp("-")) {
      this.i++;
      return { kind: "unary", op: "-", arg: this.unary() };
    }
    return this.primary();
  }

  private primary(): Expr {
    const tok = this.tok;
    if (tok.kind === "string") {
      this.i++;
      return { kind: "literal", value: tok.text };
    }
    if (tok.kind === "number") {
      this.i++;
      return { kind: "literal", value: Number(tok.text) };
    }
    if (this.isOp("(")) {
      this.i++;
      const inner = this.expr();
      this.expectOp(")");
      return inner;
    }
    if (tok.kind === "word") {
      if (tok.text.toUpperCase() === "NULL") {
        this.i++;
        return { kind: "literal", value: null };
      }
      if (KEYWORDS.has(tok.text.toUpperCase())) this.fail();
      this.i++;
      if (this.isOp("(")) {
        this.i++;
        const args: Expr[] = [];
        if (!this.isOp(")")) {
          args.push(this.expr());
          while (this.isOp(",")) {
            this.i++;
            args.push(this.expr());
          }
        }
        this.expectOp(")");
        return { kind: "call", name: tok.text.toLowerCase(), args, at: tok.at };
      }
      return { kind: "column", name: tok.text, at: tok.at };
    }
    return this.fail();
  }
}

export const SQLITE_VERSION = "3.47.0";

const FUNCTIONS: Record<string, (args: Value[]) => Value> = {
  sqlite_version: () => SQLITE_VERSION,
  upper: ([v]) => (v === null || v === undefined ? null : String(v).toUpperCase()),
  lower: ([v]) => (v === null || v === undefined ? null : String(v).toLowerCase()),
  length: ([v]) => (v === null || v === undefined ? null : String(v).length),
};

const truthy = (v: Value) => v !== null && v !== 0 && v !== "0" && v !== "";

function compare(a: Value, b: Value): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}

function evaluate(expr: Expr, row: Record<string, Value>): Value {
  switch (expr.kind) {
    case "literal":
      return expr.value;
    case "column": {
      const key = expr.name.toLowerCase();
      if (!(key in row)) throw new SqlError(`no such column: ${expr.name}`, expr.at);
      return row[key] ?? null;
    }
    case "unary": {
      const v = evaluate(expr.arg, row);
      if (v === null) return null;
      return expr.op === "NOT" ? (truthy(v) ? 0 : 1) : -Number(v);
    }
    case "call": {
      const fn = FUNCTIONS[expr.name];
      if (!fn) throw new SqlError(`no such function: ${expr.name}`, expr.at);
      return fn(expr.args.map((a) => evaluate(a, row)));
    }
    case "binary": {
      const l = evaluate(expr.left, row);
      if (expr.op === "OR" && l !== null && truthy(l)) return 1;
      if (expr.op === "AND" && l !== null && !truthy(l)) return 0;
      const r = evaluate(expr.right, row);
      switch (expr.op) {
        case "OR":
          return truthy(r) ? 1 : l === null || r === null ? null : 0;
        case "AND":
          return l === null || r === null ? null : truthy(r) ? 1 : 0;
        case "||":
          return l === null || r === null ? null : `${l}${r}`;
        case "+":
          return l === null || r === null ? null : Number(l) + Number(r);
        case "-":
          return l === null || r === null ? null : Number(l) - Number(r);
        case "LIKE": {
          if (l === null || r === null) return null;
          const pattern = String(r).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replaceAll("%", ".*").replaceAll("_", ".");
          return new RegExp(`^${pattern}$`, "is").test(String(l)) ? 1 : 0;
        }
        default: {
          if (l === null || r === null) return null;
          const c = compare(l, r);
          const ok = { "=": c === 0, "!=": c !== 0, "<": c < 0, ">": c > 0, "<=": c <= 0, ">=": c >= 0 }[expr.op];
          return ok ? 1 : 0;
        }
      }
    }
    default: {
      const unhandled: never = expr;
      throw new Error(`unhandled expression ${JSON.stringify(unhandled)}`);
    }
  }
}

function runSelect(db: Database, select: Select): ResultSet {
  let table: Table = { columns: [], rows: [[]] };
  if (select.from) {
    const found = db[select.from.name.toLowerCase()];
    if (!found) throw new SqlError(`no such table: ${select.from.name}`, select.from.at);
    table = found;
  }
  if (select.columns.some((c) => c.expr === "*") && !select.from) throw new SqlError("no tables specified", select.at);
  const columns = select.columns.flatMap((c) => (c.expr === "*" ? table.columns : [c.name]));
  // Resolve every column once on an empty record, so a bad name fails even when no row matches.
  const probe: Record<string, Value> = Object.fromEntries(table.columns.map((c) => [c.toLowerCase(), null]));
  if (select.where) evaluate(select.where, probe);
  for (const c of select.columns) if (c.expr !== "*") evaluate(c.expr, probe);

  const rows: Value[][] = [];
  for (const values of table.rows) {
    const record: Record<string, Value> = Object.fromEntries(table.columns.map((c, i) => [c.toLowerCase(), values[i] ?? null]));
    if (select.where && !truthy(evaluate(select.where, record))) continue;
    rows.push(select.columns.flatMap((c) => (c.expr === "*" ? values : [evaluate(c.expr, record)])));
  }
  return { columns, rows };
}

export function execute(db: Database, sql: string): ResultSet {
  const query = new Parser(tokenize(sql)).query();
  const results = query.selects.map((s) => runSelect(db, s));
  const [first] = results;
  if (!first) throw new SqlError("incomplete input", sql.length);
  results.forEach((r, i) => {
    if (i > 0 && r.columns.length !== first.columns.length) {
      throw new SqlError("SELECTs to the left and right of UNION do not have the same number of result columns", query.unionAt[i - 1] ?? 0);
    }
  });
  let rows = results.flatMap((r) => r.rows);
  if (query.orderBy) {
    const { expr, desc } = query.orderBy;
    const index = expr.kind === "literal" && typeof expr.value === "number" ? expr.value - 1 : expr.kind === "column" ? first.columns.findIndex((c) => c.toLowerCase() === expr.name.toLowerCase()) : -1;
    if (index < 0 || index >= first.columns.length) throw new SqlError("ORDER BY term does not match any column in the result set", 0);
    rows = rows.toSorted((a, b) => compare(a[index] ?? null, b[index] ?? null) * (desc ? -1 : 1));
  }
  if (query.limit !== undefined) rows = rows.slice(0, query.limit);
  return { columns: first.columns, rows };
}

// The CLI error layout: the message, the SQL indented by two spaces, and a caret under the fault.
export function formatError(sql: string, err: SqlError): string {
  return [`Parse error: ${err.message}`, `  ${sql}`, `  ${" ".repeat(Math.min(err.at, sql.length))}^--- error here`].join("\n");
}
