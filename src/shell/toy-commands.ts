import { drawDice } from "../fun/dice-art.ts";
import { EMBLEMS, icon } from "../fun/emblems.ts";
import { playScene } from "../fun/scenes.ts";
import { FORTUNES } from "../fun/fortunes.ts";
import { PARTY, partyMember, roll as rollDice } from "../fun/roll.ts";
import { LUNA_PHOTOS, photo } from "../luna.ts";
import type { TerminalApi } from "../term/types.ts";
import type { Command } from "./shell.ts";

const randomItem = <T>(items: readonly T[]): T | undefined => items[Math.floor(Math.random() * items.length)];
const hidden = (c: Omit<Command, "hidden">): Command => ({ ...c, hidden: true });

function show(term: TerminalApi, name: string): void {
  const p = LUNA_PHOTOS.find((x) => x.name === name);
  if (p) term.printNode(photo(p));
}

export const fortune: Command = {
  name: "fortune",
  summary: "a fortune from Luna",
  run(_args, term) {
    term.print(randomItem(FORTUNES) ?? "");
  },
};

// The table order starts at a random seat on each page load.
let heartTurn = Math.floor(Math.random() * PARTY.length);

const TUMBLES = 12;
const TUMBLE_MS = 70;

export const roll: Command = {
  name: "roll",
  summary: "roll dice: roll 2d10, roll d100",
  async run(args, term, shell) {
    const marked = shell.mark.has;
    // A hidden flag picks the Heart party member: roll 2d10 --as yl
    const as = args.indexOf("--as");
    const forced = as >= 0 ? partyMember(args[as + 1] ?? "") : undefined;
    if (as >= 0 && !forced) return term.print(`roll: no one called '${args[as + 1] ?? ""}' at the table.`, "err");
    const spec = args.find((a, i) => !a.startsWith("--") && (as < 0 || i !== as + 1));
    const character = forced ?? PARTY[heartTurn % PARTY.length]?.name;
    const result = rollDice(spec, Math.random, { marked, signAllowed: shell.mark.signAllowed, character });
    if (typeof result === "string") return term.print(result, "err");
    // Everyone gets the spotlight: Heart rolls go round the table in order.
    if (result.system === "Heart: The City Beneath" && !forced) heartTurn++;
    if (result.system === "Delta Green") shell.mark.countDeltaGreenRoll();
    const { dice, rolls, lines, system, yellowSign: sign } = result;
    const name = sign ? "yellow-sign" : EMBLEMS[system];
    if (name) term.printNode(icon(name));
    const table = term.live();
    for (let i = 0; i < TUMBLES; i++) {
      table.set(drawDice(rolls.map(() => 1 + Math.floor(Math.random() * dice.sides)), dice.sides), "dim");
      await term.sleep(TUMBLE_MS);
    }
    table.set(drawDice(rolls, dice.sides));
    const [header, ...rest] = lines;
    term.print(header, "amber");
    for (const line of rest) term.print(line, sign ? "yellow" : undefined);
    if (sign && !marked) {
      shell.mark.set(true);
      term.print("You have seen the Yellow Sign. It is yours now. Unmask, if you can.", "yellow");
    }
  },
  complete: () => ["d4", "d6", "2d6", "d8", "d10", "2d10", "3d10", "d12", "d20", "d100"],
};

const unmask = hidden({
  name: "unmask",
  summary: "take off the mask",
  run(_args, term, shell) {
    if (!shell.mark.has) return term.print('"I wear no mask."', "dim");
    shell.mark.set(false);
    term.print('"You, sir, should unmask."', "yellow");
    term.print('"I wear no mask."', "yellow");
    term.print("The Sign fades from your prompt. You are yourself again. Probably.", "dim");
  },
});

const FISH = "<°)))><";

const sl = hidden({
  name: "sl",
  summary: "steam locomotive",
  async run(_args, term) {
    term.print("sl: you meant ls. A sardine swims by instead.", "dim");
    const line = term.live();
    for (let x = 56; x >= 0; x--) {
      line.set(`${" ".repeat(x)}${FISH}`, "amber");
      await term.sleep(30);
    }
    line.set("");
  },
});

const MATRIX_CHARS = "ルナサーディン01=^.^=";

const matrix = hidden({
  name: "matrix",
  summary: "wake up",
  async run(_args, term) {
    const rows = 12;
    const cols = 48;
    const screen = term.live();
    const drops = Array.from({ length: cols }, () => -Math.floor(Math.random() * rows * 2));
    for (let frame = 0; frame < 70; frame++) {
      const grid = Array.from({ length: rows }, () => Array.from({ length: cols }, () => " "));
      drops.forEach((head, c) => {
        for (let k = 0; k < 6; k++) {
          const r = head - k;
          const row = grid[r];
          if (row) row[c] = MATRIX_CHARS[Math.floor(Math.random() * MATRIX_CHARS.length)] ?? " ";
        }
        drops[c] = head > rows + 6 ? -Math.floor(Math.random() * rows) : head + 1;
      });
      screen.set(grid.map((row) => row.join("")).join("\n"), "blue");
      await term.sleep(60);
    }
    screen.set("Wake up, guest. Luna has you.", "amber");
  },
});

const hack = hidden({
  name: "hack",
  summary: "hack the planet",
  async run(args, term) {
    const target = args[0] ?? "krajla.space";
    const steps = [
      `[*] scanning ${target} ...`,
      "[*] found open port: the food bowl",
      "[*] bypassing the firewall (the door is open)",
      "[*] brute-forcing the treat cupboard ...",
    ];
    for (const s of steps) {
      term.print(s, "blue");
      await term.sleep(450);
    }
    const bar = term.live();
    for (let i = 0; i <= 20; i++) {
      bar.set(`[${"#".repeat(i)}${"-".repeat(20 - i)}] ${i * 5}%`, "blue");
      await term.sleep(80);
    }
    term.print("[!] ACCESS DENIED: Luna is sitting on the keyboard.", "err");
  },
});

const MUG = String.raw`    ( (
     ) )
  .______.
  |      |]
  \      /
   '----'`;

const SPILL = String.raw`
        .  *  .
  ___.--'~~~~'--.____    *crash*
 (__________________)`;

const coffee = hidden({
  name: "coffee",
  summary: "brew coffee",
  async run(_args, term) {
    const art = term.live();
    art.set(MUG);
    term.print("418 I'm a teapot.", "err");
    await term.sleep(900);
    art.set(SPILL, "amber");
    term.print("Luna knocked the coffee off the table anyway. She looked at you while she did it.", "dim");
  },
});

const sudo = hidden({
  name: "sudo",
  summary: "become root",
  run(args, term) {
    if (!args.length) return term.print("usage: sudo <command>. Not that it will help.", "dim");
    term.print("[sudo] password for guest: ********");
    term.print("guest is not in the sudoers file. This incident will be reported to Luna.", "err");
  },
});

const REMOVED = ["/home/guest/welcome.txt", "/home/guest/.luna_was_here", "/usr/bin/treats", "/etc/sofa.conf", "/var/lib/sardines", "/boot/luna"];

const rm = hidden({
  name: "rm",
  summary: "remove files",
  async run(args, term) {
    const flags = args.filter((a) => a.startsWith("-")).join("");
    const targets = args.filter((a) => !a.startsWith("-"));
    const everything = /r/.test(flags) && targets.some((t) => t === "/" || t === "/*" || t === "~" || t === "~/");
    if (!everything) {
      if (!targets.length) return term.print("rm: missing operand", "err");
      for (const t of targets) term.print(`rm: cannot remove '${t}': Luna is sitting on it`, "err");
      return;
    }
    term.effect("shake", 2200);
    for (const path of REMOVED) {
      term.print(`removed '${path}'`, "err");
      await term.sleep(220);
    }
    term.print("kernel panic: not syncing: cat not found", "err");
    await term.sleep(1000);
    term.print("jk. Luna sat on the delete key before you pressed it. Nothing was removed.", "amber");
  },
});

const exit = hidden({
  name: "exit",
  summary: "leave",
  async run(_args, term) {
    term.print("There is no escape. You are on Luna.", "amber");
    await playScene(term, () => import("ascii.rest/pieces/earthrise"), { seconds: 8, cls: "blue" });
    term.print("Home is right there. Luna is sitting in front of the door.", "dim");
  },
});

const GG = String.raw`  ___   ___
 / __| / __|
| (_ || (_ |
 \___| \___|  wp`;

const gg = hidden({
  name: "gg",
  summary: "good game",
  run(_args, term) {
    show(term, "league");
    term.print(GG, "amber");
  },
});

const ff15 = hidden({
  name: "ff15",
  summary: "surrender",
  run(_args, term) {
    show(term, "league");
    term.print("/ff15: Luna voted no. 1 of 5 voted yes. The surrender failed.", "amber");
    term.print("She does not surrender. She lies down in the middle of the lane and waits.", "dim");
  },
});

const TOP = `PID  USER    %CPU  %MEM  COMMAND
  1  luna    97.3  41.0  sleep --everywhere
  9  luna     9.0   3.0  stare --at=food-bowl
 15  luna    15.0   3.0  stare --at=food-bowl
 21  luna    21.0   3.0  stare --at=food-bowl
 42  luna     4.2   1.1  judge --target=guest
300  luna     3.0   0.3  zoomies --cron="0 3 * * *"
610  robert   0.4   0.2  work --on=inflexa
612  guest    0.0   0.0  top`;

const top = hidden({
  name: "top",
  summary: "processes",
  run(_args, term) {
    term.print(TOP);
  },
});

const LOADED = Date.now();

const uptime = hidden({
  name: "uptime",
  summary: "how long",
  run(_args, term) {
    const now = new Date();
    const seconds = Math.floor((Date.now() - LOADED) / 1000);
    const up = seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min`;
    term.print(`${now.toTimeString().slice(0, 8)} up ${up}, 1 guest, 1 cat, load average: 0.09, 0.15, 0.21`);
  },
});

export const TOY_COMMANDS: Command[] = [fortune, roll, unmask, sl, matrix, hack, coffee, sudo, rm, exit, gg, ff15, top, uptime];
