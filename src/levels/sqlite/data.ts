import { unseal } from "../../ctf/seal.ts";
import type { Database, Table } from "./engine.ts";

// The stash's contents are sealed with its table and column name, so they only exist after a query reads them.
const STASH_PHRASE = "stash.contents";
const SEALED_STASH = [
  "rZvLJj0UD8sKGHi9+ZNhgFTjXY8vgOfrsd+nuX2JQFh9AkT52isuduBghSdNBIIYYxgGfImUtzBaH3TVpFlI",
  "ugSliemL2sLtRYY1hqFUznNVlqNiP8RwbrBO0xiyQUPzI8+yT53cyxZrh2gWnnJlOUFfpB/is7Tg9lrz5AkOWw==",
  "5Eb44upV6wvl9VSdCUFpV681YdvZbbl/zCo5UWcKXUZi2ND+VlHcalZfq67C4Xs6Sx+actkOhTFmu2lVcWROxO4JpavBlYAT",
];
const STASH_OWNERS = ["luna", "luna", "robert"];

const TABLES: Record<string, Table> = {
  treats: {
    columns: ["name", "kcal", "rating"],
    rows: [
      ["sardine", 120, 10],
      ["tuna", 90, 9],
      ["chicken", 110, 8],
      ["salmon", 100, 8],
      ["kibble", 40, 3],
      ["cucumber", 2, 0],
    ],
  },
  naps: {
    columns: ["spot", "hours", "judged"],
    rows: [
      ["laptop", 3, "yes"],
      ["your pillow", 6, "yes"],
      ["the warm laundry", 2, "very"],
      ["under the monitor", 4, "no"],
      ["the plant", 1, "the plant"],
    ],
  },
  knocked_off: {
    columns: ["item", "from_where", "regret"],
    rows: [
      ["Robert's coffee", "the desk", 0],
      ["a pen", "the table", 0],
      ["the TV remote", "the sofa", 0],
      ["a glass of water", "the nightstand", 0],
      ["a houseplant", "the windowsill", 1],
    ],
  },
};

const SCHEMA: [string, string][] = [
  ["treats", "CREATE TABLE treats (name TEXT PRIMARY KEY, kcal INTEGER, rating INTEGER)"],
  ["naps", "CREATE TABLE naps (spot TEXT, hours INTEGER, judged TEXT)"],
  ["knocked_off", "CREATE TABLE knocked_off (item TEXT, from_where TEXT, regret INTEGER)"],
  ["stash", "CREATE TABLE stash (id INTEGER PRIMARY KEY, owner TEXT, contents TEXT)"],
];

export async function openLunaDb(): Promise<Database> {
  const contents = await Promise.all(SEALED_STASH.map((s) => unseal(s, STASH_PHRASE)));
  const schema: Table = {
    columns: ["type", "name", "tbl_name", "rootpage", "sql"],
    rows: SCHEMA.map(([name, sql], i) => ["table", name, name, i + 2, sql]),
  };
  return {
    ...TABLES,
    stash: { columns: ["id", "owner", "contents"], rows: contents.map((c, i) => [i + 1, STASH_OWNERS[i] ?? "luna", c]) },
    // SQLite 3.33 renamed the catalog to sqlite_schema and kept sqlite_master as an alias. Both work.
    sqlite_master: schema,
    sqlite_schema: schema,
  };
}
