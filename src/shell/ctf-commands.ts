import { findSardine, SARDINES, TIERS } from "../ctf/sardines.ts";
import type { Command, Shell } from "./shell.ts";

const BAR_WIDTH = 20;

function countFound(shell: Shell): number {
  return SARDINES.filter((s) => shell.progress.has(s.id)).length;
}

export const submit: Command = {
  name: "submit",
  summary: "hand a sardine to Luna",
  async run(args, term, shell) {
    const flag = args.join(" ");
    if (!flag) return term.print("usage: submit sardine{...}", "dim");
    const sardine = await findSardine(flag);
    if (!sardine) return term.print("Luna sniffs it and walks away. That is not a sardine.", "err");
    if (shell.progress.has(sardine.id)) return term.print(`You already gave her ${sardine.name}. She remembers.`, "dim");
    shell.progress.add(sardine.id);
    const found = countFound(shell);
    term.print(`Om nom. +1 sardine: ${sardine.name}. (${found}/${SARDINES.length})`, "amber");
    if (found === SARDINES.length) term.print("That was the last one. Luna is full. For now.", "amber");
  },
};

export const sardines: Command = {
  name: "sardines",
  summary: "count your sardines",
  run(_args, term, shell) {
    const found = countFound(shell);
    const filled = Math.round((found / SARDINES.length) * BAR_WIDTH);
    term.print(`[${"#".repeat(filled)}${"-".repeat(BAR_WIDTH - filled)}] ${found}/${SARDINES.length}`, "amber");
    for (const tier of TIERS) {
      const inTier = SARDINES.filter((s) => s.tier === tier);
      if (!inTier.length) continue;
      const got = inTier.filter((s) => shell.progress.has(s.id));
      term.print(`  ${tier.padEnd(6)} ${got.length}/${inTier.length}  ${got.map((s) => s.name).join(", ")}`);
    }
  },
};

export const CTF_COMMANDS: Command[] = [submit, sardines];
