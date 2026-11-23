import type { Progress } from "../ctf/progress.ts";
import { FINALE_IDS, openFinale } from "../ctf/finale.ts";
import { SARDINES, TIERS } from "../ctf/sardines.ts";
import { LUNA_PHOTOS, photo } from "../luna.ts";
import type { TerminalApi } from "../term/types.ts";

const TIER_CLASS = { easy: "ok", medium: "amber", hard: "err" } as const;
// Each sardine arrives as a small school: a lead fish and two smaller ones just behind it.
const SCHOOL = [
  { lag: 0, dy: 0, small: false },
  { lag: 160, dy: -4, small: true },
  { lag: 300, dy: 5, small: true },
];
// The pace builds up: a steady stream of easy and medium sardines, a pause, then each hard one alone and slow,
// eaten with a chomp before the next one sets off. A last big chomp and a silence come before the message.
const STREAM_GAP_MS = 700;
const STREAM_SWIM_MS = 2200;
const PAUSE_BEFORE_HARD_MS = 1800;
const HARD_SWIM_MS = 3000;
const AFTER_BITE_MS = 900;
const FINAL_CHOMP_MS = 2400;
const SILENCE_MS = 1500;
const CHAR_MS = 45;
const LINE_PAUSE_MS = 500;

function chomp(face: HTMLElement, base: string, big: boolean): void {
  face.className = base;
  // Reading the layout restarts the CSS animation when the same class goes on again.
  void face.offsetWidth;
  face.className = `${base} chomp${big ? " big" : ""}`;
}

// Every sardine the player found swims into Luna, easy ones first and the hard ones last and biggest.
// Then the finale message opens with the proofs of the hard sardines and types out under the photo.
export async function playFinale(term: TerminalApi, progress: Progress): Promise<void> {
  const proofs = FINALE_IDS.map((id) => progress.proof(id));
  if (proofs.some((p) => p === undefined)) return term.print("Luna is still hungry. Some sardines are missing.", "dim");
  const message = openFinale(proofs.map((p) => p ?? ""));

  const box = document.createElement("div");
  box.className = "finale";
  const boss = LUNA_PHOTOS.find((p) => p.name === "boss");
  const face = boss ? photo(boss) : document.createElement("div");
  const base = face.className;
  box.append(face);

  const fish = TIERS.flatMap((tier) => SARDINES.filter((s) => s.tier === tier && progress.has(s.id)));
  const bites: number[] = [];
  let clock = 0;
  fish.forEach((s, i) => {
    const hard = s.tier === "hard";
    if (hard && !bites.length) clock += PAUSE_BEFORE_HARD_MS;
    const swim = hard ? HARD_SWIM_MS : STREAM_SWIM_MS;
    const fromLeft = i % 2 === 0;
    const fy = ((i * 37) % 50) - 25;
    for (const member of SCHOOL) {
      const span = document.createElement("span");
      const size = member.small ? " small" : hard ? " big" : "";
      span.className = `finale-fish ${TIER_CLASS[s.tier]}${size}`;
      span.textContent = fromLeft ? "><>" : "<><";
      span.style.setProperty("--fx", `${fromLeft ? -60 : 60}cqw`);
      span.style.setProperty("--fy", `${fy + member.dy}cqw`);
      span.style.setProperty("--delay", `${clock + member.lag}ms`);
      span.style.setProperty("--swim", `${swim}ms`);
      box.append(span);
    }
    if (hard) {
      bites.push(clock + swim);
      clock += swim + AFTER_BITE_MS;
    } else {
      clock += STREAM_GAP_MS;
    }
  });
  term.printNode(box);

  let now = 0;
  for (const [i, bite] of bites.entries()) {
    await term.sleep(bite - now);
    now = bite;
    chomp(face, base, i === bites.length - 1);
  }
  await term.sleep(Math.max(0, clock - now) + FINAL_CHOMP_MS + SILENCE_MS);

  const text = await message;
  if (text === undefined) return term.print("The message is scrambled. Someone has been editing Luna's memory.", "err");
  term.print();
  for (const line of text.split("\n")) {
    const row = term.live();
    for (let n = 1; n <= line.length; n++) {
      row.set(line.slice(0, n), "amber");
      await term.sleep(CHAR_MS);
    }
    if (!line) row.set("");
    await term.sleep(LINE_PAUSE_MS);
  }
}
