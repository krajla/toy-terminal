import { catsay as drawCatsay } from "../fun/catsay.ts";
import { feed as feedLuna, isMealTime } from "../fun/feeding.ts";
import { nextFortune } from "../fun/fortunes.ts";
import { zoomToFactionSheet } from "../fun/galaxy-zoom.ts";
import { leaderCard } from "../fun/leader-card.ts";
import { playScene, sandworm } from "../fun/scenes.ts";
import { clip, LUNA_PHOTOS, photo, PLAY_CLIP, POSES, type LunaPhoto } from "../luna.ts";
import type { TerminalApi } from "../term/types.ts";
import { PetMood } from "../fun/pet.ts";
import { freshPicker } from "../fun/random.ts";
import type { Command } from "./shell.ts";


function show(term: TerminalApi, name: string): void {
  const p: LunaPhoto | undefined = LUNA_PHOTOS.find((x) => x.name === name);
  if (p) term.printNode(photo(p));
}

export const luna: Command = {
  name: "luna",
  summary: "summon the cat",
  run(args, term) {
    const wanted = args[0];
    const pick = wanted ? POSES.find((p) => p.name === wanted) : nextPose();
    if (!pick) return term.print(`luna: no such pose: ${wanted}`, "err");
    term.printNode(photo(pick));
    term.print(pick.caption, "dim");
  },
  complete: () => POSES.map((p) => p.name),
};

const RUNNER = "=^..^=";
const TRACK = 48;

export const zoomies: Command = {
  name: "zoomies",
  summary: "03:00 energy",
  hidden: true,
  async run(_args, term) {
    show(term, "swipe");
    const line = term.live();
    for (const forward of [true, false, true]) {
      for (let step = 0; step <= TRACK; step++) {
        const x = forward ? step : TRACK - step;
        const dust = forward ? "~".repeat(Math.min(3, x)) : "";
        line.set(" ".repeat(Math.max(0, x - dust.length)) + dust + RUNNER + (forward ? "" : "~~~"), "amber");
        await term.sleep(18);
      }
    }
    line.set("Luna stops. She does not know what you are talking about.", "dim");
  },
};

const ACTION_ROW = " [1 CARDS] [2 BUILD] [3 ANIMALS] [4 ASSOCIATION] [5 =^..^=]";

async function uprising(term: TerminalApi): Promise<void> {
  term.print("You send an Agent to the Hagga Basin. No Shield Wall protects it.");
  await playScene(term, () => import("ascii.rest/pieces/desert-night"), { seconds: 8, cls: "blue", overlay: sandworm });
  term.print("You walked with rhythm, and it attracted the worm.", "amber");
  term.print("Luna joins the Conflict as a sandworm, doubles nobody's rewards, and goes back to the sofa.", "dim");
}

const GAMES: Record<string, (term: TerminalApi) => void | Promise<void>> = {
  uprising,
  dune: uprising,
  sardines(term) {
    term.printNode(clip(PLAY_CLIP));
    term.print("Luna plays with her sardine. Do not touch the sardine.", "dim");
  },
  "ark-nova"(term) {
    show(term, "box");
    term.print("You open the Ark Nova box. Luna is already in it.", "amber");
    term.print("She claims the box as a 5-space enclosure and flips it to occupied.");
    term.print(ACTION_ROW, "amber");
    term.print("Her action card sits in slot 5, at full strength. The action is SLEEP.", "dim");
    term.print("Game night is cancelled until she leaves. She will not leave.", "dim");
  },
  arcs(term) {
    term.print("You draft leaders for Arcs. One card is already face down in front of your seat.");
    term.printNode(leaderCard());
    term.print("You drafted Luna as your leader. She drafted you as her staff.", "dim");
  },
  async ti4(term) {
    await zoomToFactionSheet(term);
    term.print("Twilight Imperium 4 takes eight hours. Luna fell asleep on Mecatol Rex at hour two.");
    term.print("Her faction holds Mecatol Rex now. Its whole population is one grey cat.", "amber");
    term.print("Nobody can take the centre now. The galaxy is at peace.", "dim");
  },
};

export const play: Command = {
  name: "play",
  summary: "play a game",
  async run(args, term) {
    const game = args[0];
    const run = game ? GAMES[game] : undefined;
    if (!run) {
      if (game) term.print(`play: no such game: ${game}`, "err");
      return term.print(`usage: play <${Object.keys(GAMES).join("|")}>`, "dim");
    }
    await run(term);
  },
  complete: () => Object.keys(GAMES),
};

const FULL_BOWL = String.raw`   o .  o . o
  \___________/
   '---------'`;

const EMPTY_BOWL = String.raw`
  \___________/
   '---------'`;

export const feed: Command = {
  name: "feed",
  summary: "feed someone",
  hidden: true,
  run(args, term) {
    if (args[0] !== "luna") return term.print("feed: only Luna gets fed here. Try: feed luna", "err");
    const now = new Date();
    term.print(isMealTime(now) ? FULL_BOWL : EMPTY_BOWL, isMealTime(now) ? "amber" : "dim");
    const [first, ...rest] = feedLuna(now);
    term.print(first, "amber");
    for (const line of rest) term.print(line, "dim");
  },
  complete: () => ["luna"],
};

const mood = new PetMood();
const nextPose = freshPicker(POSES);

export const pet: Command = {
  name: "pet",
  summary: "pet someone",
  hidden: true,
  run(args, term) {
    if (args[0] !== "luna") return term.print("pet: there is only one cat here. Try: pet luna", "err");
    const step = mood.next();
    term.print(step.art, step.cls);
    term.print(step.what);
    term.print(step.verdict, "dim");
  },
  complete: () => ["luna"],
};

export const catsay: Command = {
  name: "catsay",
  summary: "Luna says a thing",
  hidden: true,
  run(args, term) {
    term.print(drawCatsay(args.length ? args.join(" ") : nextFortune()));
  },
};

export const LUNA_COMMANDS: Command[] = [luna, zoomies, play, feed, pet, catsay];
