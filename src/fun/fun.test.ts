import { expect, test } from "bun:test";
import { catsay } from "./catsay.ts";
import { feed, nextMeal } from "./feeding.ts";

const at = (h: number, m = 0) => new Date(2026, 10, 21, h, m);

test("Luna eats only during the 09, 15 and 21 hours", () => {
  expect(feed(at(9, 42))[0]).toBe("It is 09:42. Dinner is served.");
  expect(feed(at(21, 0))[0]).toBe("It is 21:00. Dinner is served.");
  expect(feed(at(14, 59))[0]).toStartWith("It is 14:59. Luna eats at 09:00, 15:00 and 21:00.");
});

test("the next meal wraps around midnight", () => {
  expect(nextMeal(at(10))).toBe("15:00");
  expect(nextMeal(at(15, 30))).toBe("21:00");
  expect(nextMeal(at(23))).toBe("09:00");
});

test("catsay wraps long text into a bubble", () => {
  expect(catsay("meow").split("\n").slice(0, 3)).toEqual([" ______", "< meow >", " ------"]);
  const lines = catsay("a ".repeat(30).trim()).split("\n");
  expect(lines[1]).toStartWith("/ ");
  expect(lines[2]).toStartWith("\\ ");
});
