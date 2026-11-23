import { LUNA_PHOTOS, photo } from "../luna.ts";
import type { TerminalApi } from "../term/types.ts";
import { leaderCard } from "./leader-card.ts";

// play arcs: a trick of Arcs on a small table, with a face-down leader card beside it. Three action cards come in
// one by one. Then Luna does not play a card: she waddles onto the trick and knocks it off the table. Last, her
// leader card turns over. A surpass must match the suit of the lead. The suits use the colours of the real cards.
const PLAYS = [
  { suit: "aggression", name: "Aggression", number: 4, line: "A rival leads Aggression 4." },
  { suit: "construction", name: "Construction", number: 2, line: "Another pivots with Construction 2." },
  { suit: "aggression", name: "Aggression", number: 6, line: "A third surpasses with Aggression 6." },
];
const AFTER = ["Luna seizes the initiative.", "Luna is the initiative."];

const CARD_MS = 1100;
const BEAT_MS = 900;
const WADDLE_MS = 2400;
const KNOCK_MS = 180;

function actionCard(suit: string, name: string, number: number): HTMLElement {
  const card = document.createElement("div");
  card.className = `action-card ${suit}`;
  const head = document.createElement("span");
  head.className = "action-suit";
  head.textContent = name;
  const value = document.createElement("span");
  value.className = "action-number";
  value.textContent = String(number);
  card.append(head, value);
  return card;
}

export async function playArcs(term: TerminalApi): Promise<void> {
  const scene = document.createElement("div");
  scene.className = "arcs-scene";
  const table = document.createElement("div");
  table.className = "arcs-table";
  const cards = PLAYS.map((p) => actionCard(p.suit, p.name, p.number));
  table.append(...cards);
  const judge = LUNA_PHOTOS.find((p) => p.name === "judge");
  const luna = judge ? photo(judge) : document.createElement("div");
  luna.className += " arcs-luna";
  table.append(luna);
  const leader = leaderCard();
  scene.append(table, leader);
  term.printNode(scene);

  for (const [i, play] of PLAYS.entries()) {
    await term.sleep(i ? CARD_MS : 300);
    const card = cards[i];
    if (card) card.className += " dealt";
    term.print(play.line, "dim");
  }
  await term.sleep(CARD_MS);
  term.print("Luna's turn.", "amber");
  await term.sleep(BEAT_MS * 1.5);
  luna.className += " waddle";
  await term.sleep(WADDLE_MS);
  term.print("Luna sits on the trick.", "amber");
  await term.sleep(BEAT_MS * 1.5);
  term.print("Then she knocks it off the table.", "amber");
  luna.className += " swat";
  for (const card of cards) {
    await term.sleep(KNOCK_MS);
    card.className += " knocked";
  }
  await term.sleep(BEAT_MS);
  for (const line of AFTER) {
    term.print(line, "amber");
    await term.sleep(BEAT_MS);
  }
  leader.className += " dealt";
  await term.sleep(1600);
}
