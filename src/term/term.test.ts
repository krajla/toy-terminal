import { describe, expect, test } from "bun:test";
import { completeWord } from "./complete.ts";
import { History } from "./history.ts";
import { ParseError, tokenize } from "./parse.ts";

describe("tokenize", () => {
  test("splits on whitespace and keeps quoted text", () => {
    expect(tokenize(`  submit "sardine{a b}"  'x y' `)).toEqual(["submit", "sardine{a b}", "x y"]);
  });

  test("keeps empty quoted arguments and escaped spaces", () => {
    expect(tokenize(`echo "" a\\ b`)).toEqual(["echo", "", "a b"]);
  });

  test("rejects an unmatched quote", () => {
    expect(() => tokenize(`echo "open`)).toThrow(new ParseError('unmatched "'));
  });
});

describe("History", () => {
  test("walks back and forward, and restores the draft", () => {
    const h = new History();
    h.add("one");
    h.add("two");
    expect(h.up("dra")).toBe("two");
    expect(h.up("two")).toBe("one");
    expect(h.up("one")).toBeUndefined();
    expect(h.down()).toBe("two");
    expect(h.down()).toBe("dra");
    expect(h.down()).toBeUndefined();
  });

  test("skips blank lines and consecutive duplicates, and obeys the limit", () => {
    const h = new History(2);
    for (const line of ["a", " ", "b", "b", "c"]) h.add(line);
    expect(h.list()).toEqual(["b", "c"]);
  });
});

describe("completeWord", () => {
  test("completes a single match with a trailing space", () => {
    expect(completeWord("he", ["help", "history"])).toEqual({ word: "help ", matches: ["help"] });
  });

  test("fills the common prefix of more than one match", () => {
    expect(completeWord("s", ["sardines", "sardine-mini", "sl"])).toEqual({
      word: "s",
      matches: ["sardine-mini", "sardines", "sl"],
    });
    expect(completeWord("sar", ["sardines", "sardine-mini"]).word).toBe("sardine");
  });
});
