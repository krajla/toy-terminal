import { expect, test } from "bun:test";
import { findSardine } from "../../ctf/sardines.ts";
import { ROOT } from "../../fs/tree.ts";
import { ALL_COMMANDS } from "../../shell/commands.ts";
import { fakeTerm, makeShell } from "../../test-helpers.ts";
import type { Session } from "../../term/types.ts";
import { openLunaDb } from "./data.ts";
import { execute, formatError, SqlError } from "./engine.ts";
import { treatQuery } from "./kiosk.ts";

async function sqlError(sql: string): Promise<string> {
  try {
    execute(await openLunaDb(), sql);
  } catch (err) {
    if (err instanceof SqlError) return formatError(sql, err);
    throw err;
  }
  throw new Error(`no error for: ${sql}`);
}

test("a lookup by name returns that treat", async () => {
  expect(execute(await openLunaDb(), treatQuery("sardine")).rows).toEqual([["sardine", 120, 10]]);
});

test("a stray quote leaks the query, with the caret on the string that it leaves open", async () => {
  // The input ' makes the query end in ''' and SQLite reads '' as an escaped quote, so the open string is '''.
  // The quote is 51 characters in, so SQLite drops 1 leading character and puts the label left of the caret.
  expect(await sqlError(treatQuery("'"))).toBe(
    [
      `Parse error: unrecognized token: "'''"`,
      "  ELECT name, kcal, rating FROM treats WHERE name = '''",
      `  ${" ".repeat(36)}error here ---^`,
    ].join("\n"),
  );
});

test("an early fault puts the label right of the caret, as SQLite does", async () => {
  expect(await sqlError("SELECT nope FROM treats")).toBe(
    ["Parse error: no such column: nope", "  SELECT nope FROM treats", "         ^--- error here"].join("\n"),
  );
});

test("errors that SQLite gives no position print the message only", async () => {
  expect(await sqlError(treatQuery("' UNION SELECT name FROM sqlite_master --"))).toBe(
    "Parse error: SELECTs to the left and right of UNION do not have the same number of result columns",
  );
  expect(await sqlError("SELECT * FROM secrets")).toBe("Parse error: no such table: secrets");
  expect(await sqlError("SELECT name FROM treats WHERE")).toBe("Parse error: incomplete input");
  expect(await sqlError("SELECT name FROM treats ORDER BY 5")).toBe(
    "Parse error: 1st ORDER BY term out of range - should be between 1 and 1",
  );
});

test("stacked statements and junk get SQLite's messages", async () => {
  expect(await sqlError("SELECT 1; DROP TABLE treats")).toBe("Parse error: You can only execute one statement at a time.");
  expect(await sqlError("SELECT name treats rating")).toStartWith('Parse error: near "rating": syntax error');
});

async function kioskOutput(shell: ReturnType<typeof makeShell>, inputs: string[]) {
  const { term, lines, stack } = fakeTerm();
  await shell.run("sqlite luna.db", term);
  const kiosk: Session | undefined = stack[0];
  if (!kiosk) throw new Error("the kiosk did not open");
  for (const input of inputs) await kiosk.run(input, term);
  return { text: lines.map((l) => l.text).join("\n"), stack };
}

test("the injection path: OR 1=1, then sqlite_master, then the stash, which holds the sardine", async () => {
  const shell = makeShell(ALL_COMMANDS, ROOT);
  const { text } = await kioskOutput(shell, [
    "SELECT * FROM stash",
    ".tables",
    ".treat ' OR 1=1 --",
    ".treat ' UNION SELECT name, type, sql FROM sqlite_master --",
    ".treat ' UNION SELECT id, owner, contents FROM stash --",
  ]);
  expect(text).toContain("raw SQL is disabled");
  expect(text).toContain(".tables is disabled");
  expect(text).toContain("cucumber");
  expect(text).toContain("CREATE TABLE stash (id INTEGER PRIMARY KEY, owner TEXT, contents TEXT)");
  const flag = text.match(/sardine\{[a-z0-9_]+\}/)?.[0] ?? "";
  expect((await findSardine(flag))?.id).toBe("sqlite");
});

test("the catalog answers to both SQLite names, and other engines' catalogs do not exist", async () => {
  const db = await openLunaDb();
  const names = (sql: string) => execute(db, sql).rows.map((r) => r[0]);
  expect(names("SELECT name FROM sqlite_schema")).toEqual(names("SELECT name FROM sqlite_master"));
  expect(await sqlError("SELECT name FROM user_tables")).toStartWith("Parse error: no such table: user_tables");
});

test(".quit leaves the kiosk", async () => {
  const shell = makeShell(ALL_COMMANDS, ROOT);
  const { stack } = await kioskOutput(shell, [".quit"]);
  expect(stack).toEqual([]);
});
