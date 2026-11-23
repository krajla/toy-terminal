import { IMPOSSIBLE_LANDSCAPES } from "./king-in-yellow.ts";
import { freshPicker } from "./random.ts";

export type Rng = () => number;

export interface Dice {
  count: number;
  sides: number;
  modifier: number;
}

export interface RollResult {
  system: string;
  dice: Dice;
  rolls: number[];
  lines: string[];
  yellowSign?: boolean;
}

/** What a system says about a roll. A Delta Green roll can also show the Yellow Sign. */
type Reading = string[] | { lines: string[]; yellowSign: true };

interface System {
  name: string;
  fits(d: Dice): boolean;
  fallback?: Dice;
  read(d: Dice, rolls: number[], rng: Rng, context: { signAllowed: boolean; character?: string }): Reading;
}

export const MAX_DICE = 20;

const DICE = /^(\d*)d(\d+)([+-]\d+)?$/i;

export function parseDice(spec: string): Dice | undefined {
  const m = DICE.exec(spec.trim());
  if (!m) return undefined;
  const count = m[1] ? Number(m[1]) : 1;
  const sides = Number(m[2]);
  if (count < 1 || count > MAX_DICE || sides < 2 || sides > 1000) return undefined;
  return { count, sides, modifier: m[3] ? Number(m[3]) : 0 };
}

// The joke for a well-formed roll that no real dice can make, or undefined for a roll that is possible.
export function impossibleDice(spec: string): string | undefined {
  const m = DICE.exec(spec.trim());
  if (!m) return undefined;
  const count = m[1] ? Number(m[1]) : 1;
  const sides = Number(m[2]);
  if (count === 0) return "You roll no dice at all. Luna approves: that is exactly her amount of effort.";
  if (count > MAX_DICE) return `You pour ${count} dice on the table. Luna knocks them off, one at a time, while she looks at you. Roll at most ${MAX_DICE}.`;
  if (sides === 0) return "A d0 has no faces. Luna stares at it anyway, and it stares back.";
  if (sides === 1) return "A d1 is a marble. Luna bats it under the sofa. It rolled a 1.";
  if (sides > 1000) return `A d${sides} is not a die, it is a ball. Luna is already chasing it down the hall.`;
  return undefined;
}

const pick = <T>(items: readonly T[], rng: Rng): T => {
  const item = items[Math.floor(rng() * items.length)];
  if (item === undefined) throw new Error("pick from an empty list");
  return item;
};
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const signed = (n: number) => (n > 0 ? ` + ${n}` : n < 0 ? ` - ${-n}` : "");

const WEAPONS: Record<number, string> = {
  4: "dagger",
  6: "shortsword",
  8: "longsword",
  10: "heavy crossbow",
  12: "greataxe",
};

const dnd: System = {
  name: "D&D",
  fits: (d) => [4, 6, 8, 10, 12, 20].includes(d.sides),
  read(d, rolls) {
    if (d.sides === 20) {
      const kept = d.count === 2 ? Math.max(...rolls) : (rolls[0] ?? 0);
      const note = d.count === 2 ? "Advantage, so you keep the higher die. " : "";
      if (kept === 20) return [`${note}Natural 20. Critical hit. The DM sighs.`];
      if (kept === 1) return [`${note}Natural 1. Your sword is now in the box with Luna.`];
      return [`${note}${kept + d.modifier} to hit. Does that beat the AC? Ask the DM.`];
    }
    const total = sum(rolls) + d.modifier;
    if (d.sides === 6 && d.count === 8) return [`Fireball: ${total} fire damage. Dexterity save for half. Luna is immune.`];
    return [`${total} damage with a ${WEAPONS[d.sides] ?? "weapon"}.`];
  },
};

const nextCost = freshPicker(["the Bluecoats saw you", "you take 2 stress", "Luna knocked over a lamp"]);

const blades: System = {
  name: "Blades in the Dark",
  fits: (d) => d.sides === 6 && d.count <= 6 && d.modifier === 0,
  read(_d, rolls, rng) {
    const sixes = rolls.filter((r) => r === 6).length;
    const best = Math.max(...rolls);
    if (sixes >= 2) return ["Critical. You do it with increased effect. Luna is impressed, and she hides it."];
    if (best === 6) return ["Full success. You get away clean."];
    if (best >= 4)
      return [`Partial success. You do it, but ${nextCost(rng)}.`];
    return ["Bad outcome. Things go wrong. Roll to resist, or accept it."];
  },
};

const RESISTANCES = ["Blood", "Mind", "Echo", "Fortune", "Supplies"];
const nextResistance = freshPicker(RESISTANCES);

// Robert's Heart party, with their own line for each result: critical failure (1), failure (2-5),
// success at a cost (6-7), success (8-9) and critical success (10).
export const PARTY = [
  {
    name: "Alex",
    lines: [
      "The pistol coughs sparks and the spell falls apart in your hands. Your hand keeps writing a name you don't know. Fail, and take double stress.",
      "The wiring holds for one breath, then snaps. Fail, and take stress.",
      "It works, but the ink on your fingers isn't yours, and the glyph it made isn't one you know. Succeed, and take stress.",
      "Bent copper, bad solder, perfect timing. Succeed.",
      "The junk magic holds together, for now. Critical success: your outgoing stress die steps up once.",
    ],
  },
  {
    name: "Balthazar",
    lines: [
      "The bandages come loose and something under them answers first. Fail, and take double stress.",
      "You measured twice. The Heart moved the ruler. Fail, and take stress.",
      "The sample is good, but it cost you blood. Write that down for the paper. Succeed, and take stress.",
      "A tall shadow, a quiet step, and the job's done. Succeed.",
      "Death leans in to take notes. Critical success: your outgoing stress die steps up once.",
    ],
  },
  {
    name: "Yl",
    lines: [
      "The hive goes silent. The Heartbeet skips. Fail, and take double stress.",
      "Wrong frequency. The swarm turns on itself. Fail, and take stress.",
      "The bees obey, but they took their price in stings. Succeed, and take stress.",
      "The hum and the Heart beat as one. Succeed.",
      "The whole Heart resonates and the queen sings back. Critical success: your outgoing stress die steps up once.",
    ],
  },
  {
    name: "Ash-On-Snow",
    lines: [
      "For one moment you see your brother's face on the scaffold. Fail, and take double stress.",
      "The uniform still remembers orders you can't follow. Fail, and take stress.",
      "You take the blow meant for someone else again. Succeed, and take stress.",
      "Old training, new purpose. Succeed.",
      "For one moment the debt feels lighter. Critical success: your outgoing stress die steps up once.",
    ],
  },
];

/** The party member whose name starts with `prefix`, ignoring case. */
export function partyMember(prefix: string): string | undefined {
  return PARTY.find((p) => p.name.toLowerCase().startsWith(prefix.toLowerCase()))?.name;
}

const heart: System & { fallback: Dice } = {
  name: "Heart: The City Beneath",
  fits: (d) => d.modifier === 0 && (d.sides === 10 || (d.count === 1 && [4, 6, 8, 12].includes(d.sides))),
  fallback: { count: 2, sides: 10, modifier: 0 },
  read(d, rolls, rng, { character }) {
    const best = Math.max(...rolls);
    const member = PARTY.find((p) => p.name === character) ?? pick(PARTY, rng);
    if (d.sides !== 10) return [`${member.name} takes ${best} stress to ${nextResistance(rng)}. The Heart notices.`];
    const result = best === 10 ? 4 : best >= 8 ? 3 : best >= 6 ? 2 : best >= 2 ? 1 : 0;
    return [`${member.name}: ${member.lines[result] ?? ""}`];
  },
};

const SKILLS: [string, number][] = [
  ["Alertness", 50],
  ["Bureaucracy", 40],
  ["Occult", 30],
  ["Search", 60],
  ["Stealth", 40],
  ["Unnatural", 7],
];
const nextSkill = freshPicker(SKILLS);

// Once the mark is on the player, every roll quotes Impossible Landscapes, so the quote must not repeat.
const nextLandscape = freshPicker(IMPOSSIBLE_LANDSCAPES);

// Rare on purpose: the first Yellow Sign marks the player (see YellowMark).
const KING_IN_YELLOW_ODDS = 1 / 5;

const deltaGreen: System = {
  name: "Delta Green",
  fits: (d) => d.count === 1 && d.modifier === 0 && [4, 6, 8, 10, 100].includes(d.sides),
  read(d, rolls, rng, { signAllowed }) {
    const r = rolls[0] ?? 0;
    let lines: string[];
    if (d.sides !== 100) {
      lines = [`SAN loss: ${r}. You saw a grey entity with folded ears. It saw you first.`];
    } else {
      const [skill, rating] = nextSkill(rng);
      const success = r <= rating;
      const matching = r < 100 && r % 11 === 0;
      const label = `${String(r).padStart(2, "0")} against ${skill} ${rating}%.`;
      if (success && (r === 1 || matching)) lines = [label, "Critical success. Twice as good. Do not write it down."];
      else if (success) lines = [label, "Success. The report will say nothing happened."];
      else if (r === 100 || matching) lines = [label, "Fumble. Your Handler is not going to like this."];
      else lines = [label, "Failure. Mark the skill for improvement, if you survive."];
    }
    if (!signAllowed || rng() >= KING_IN_YELLOW_ODDS) return lines;
    return { lines: [...lines, ...nextLandscape(rng)], yellowSign: true };
  },
};

export const SYSTEMS: System[] = [dnd, blades, heart, deltaGreen];

export interface RollOptions {
  /** The player carries the Yellow Sign: every roll shows it. */
  marked?: boolean;
  /** False for the player's first Delta Green rolls, which never show the Sign. */
  signAllowed?: boolean;
  /** The Heart party member who rolls. Without it, a random one. */
  character?: string;
}

export function roll(spec: string | undefined, rng: Rng = Math.random, { marked = false, signAllowed = true, character }: RollOptions = {}): RollResult | string {
  let dice: Dice;
  let system: System | undefined;
  if (spec === undefined) {
    system = heart;
    dice = heart.fallback;
  } else {
    const parsed = parseDice(spec);
    if (!parsed) return impossibleDice(spec) ?? `roll: cannot read '${spec}'. Try 2d10, d20+3 or d100 (at most ${MAX_DICE} dice).`;
    dice = parsed;
    // Robert prefers Heart, so it wins whenever its dice fit.
    const fitting = SYSTEMS.filter((s) => s.fits(dice));
    system = fitting.includes(heart) ? heart : fitting.length ? pick(fitting, rng) : undefined;
  }
  const rolls = Array.from({ length: dice.count }, () => 1 + Math.floor(rng() * dice.sides));
  const header = `${dice.count}d${dice.sides}${signed(dice.modifier)}: [${rolls.join(", ")}]`;
  if (!system) {
    const total = sum(rolls) + dice.modifier;
    // A system can use this die, only not this many at once or with a modifier.
    const owners = SYSTEMS.filter((s) => s.fits({ count: 1, sides: dice.sides, modifier: 0 })).map((s) => s.name);
    const why = owners.length
      ? `No game at Robert's table rolls ${dice.count}d${dice.sides}${signed(dice.modifier)}. ${owners.join(" and ")} rolls one d${dice.sides} at a time. Total: ${total}.`
      : `No game at Robert's table uses a d${dice.sides}. Luna rolled it under the sofa. Total: ${total}.`;
    return { system: "none", dice, rolls, lines: [header, why] };
  }
  const reading = system.read(dice, rolls, rng, { signAllowed, character });
  const { lines, yellowSign } = Array.isArray(reading) ? { lines: reading, yellowSign: undefined } : reading;
  if (marked && !yellowSign) {
    return { system: system.name, dice, rolls, lines: [`${header}  (${system.name})`, ...lines, ...nextLandscape(rng)], yellowSign: true };
  }
  return { system: system.name, dice, rolls, lines: [`${header}  (${system.name})`, ...lines], yellowSign };
}
