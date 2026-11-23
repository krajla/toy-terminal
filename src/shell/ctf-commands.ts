import { proofOf, sardineForProof, SARDINES, TIERS, type Tier } from "../ctf/sardines.ts";
import { playFinale } from "../fun/finale-scene.ts";
import type { Part } from "../term/types.ts";
import type { Command, Shell } from "./shell.ts";

const BAR_WIDTH = 20;
const TIER_CLASS: Record<Tier, string> = { easy: "ok", medium: "amber", hard: "err" };

function countFound(shell: Shell): number {
  return SARDINES.filter((s) => shell.progress.has(s.id)).length;
}

export const submit: Command = {
  name: "submit",
  summary: "hand a sardine to Luna",
  async run(args, term, shell) {
    const flag = args.join(" ");
    if (!flag) return term.print("usage: submit sardine{...}", "dim");
    const proof = await proofOf(flag);
    const sardine = await sardineForProof(proof);
    if (!sardine) return term.print("Luna sniffs it and walks away. That is not a sardine.", "err");
    if (shell.progress.has(sardine.id)) return term.print(`You already gave her ${sardine.name}. She remembers.`, "dim");
    shell.progress.add(sardine.id, proof);
    const found = countFound(shell);
    term.print(`Om nom. +1 sardine: ${sardine.name}. (${found}/${SARDINES.length})`, "amber");
    if (found < SARDINES.length) return;
    term.print("That was the last one. Luna is full. For now.", "amber");
    await playFinale(term, shell.progress);
  },
};

// Plays the finale again for a player who found every sardine.
export const finale: Command = {
  name: "finale",
  summary: "the end",
  hidden: true,
  async run(_args, term, shell) {
    const left = SARDINES.length - countFound(shell);
    if (left) return term.print(`Luna is not full yet. ${left} sardine${left === 1 ? "" : "s"} to go.`, "dim");
    await playFinale(term, shell.progress);
  },
};

export const sardines: Command = {
  name: "sardines",
  summary: "count your sardines",
  run(_args, term, shell) {
    // Each found sardine fills its share of the bar in the colour of its tier, easy ones first.
    const got = TIERS.flatMap((tier) => SARDINES.filter((s) => s.tier === tier && shell.progress.has(s.id)));
    const bar: Part[] = [{ text: "[" }];
    got.forEach((s, i) => {
      const cells = Math.round(((i + 1) / SARDINES.length) * BAR_WIDTH) - Math.round((i / SARDINES.length) * BAR_WIDTH);
      bar.push({ text: "#".repeat(cells), cls: TIER_CLASS[s.tier] });
    });
    const filled = Math.round((got.length / SARDINES.length) * BAR_WIDTH);
    bar.push({ text: `${"-".repeat(BAR_WIDTH - filled)}] ${got.length}/${SARDINES.length}`, cls: "dim" });
    term.printParts(bar);
    for (const tier of TIERS) {
      const inTier = SARDINES.filter((s) => s.tier === tier);
      if (!inTier.length) continue;
      const names = inTier.filter((s) => shell.progress.has(s.id)).map((s) => s.name);
      term.printParts([
        { text: "  " },
        { text: tier.padEnd(6), cls: TIER_CLASS[tier] },
        { text: ` ${names.length}/${inTier.length}  ${names.join(", ")}` },
      ]);
    }
  },
};

export const CTF_COMMANDS: Command[] = [submit, sardines, finale];
