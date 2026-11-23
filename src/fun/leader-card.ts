import { LUNA_PHOTOS, photo } from "../luna.ts";

interface Ability {
  name: string;
  text: string;
}

// The layout of a real Arcs leader: two abilities, starting pieces in boxes A, B and C, two starting resources.
const ABILITIES: Ability[] = [
  { name: "Sits On It.", text: "Luna sits on one card in the court. No one can secure that card while she is on it." },
  { name: "Knocks Things Over.", text: "At the end of each round, remove 1 ship. Not from the board. From the table." },
];
const SETUP = ["A: 1 sofa", "B: 2 ships", "C: 9 lives"];
const RESOURCES = "Psionic, Relic";

function el(tag: string, cls: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Cross-shaped stars on the card art, as [left %, top %, size px].
const STARS: [number, number, number][] = [
  [12, 30, 9], [78, 22, 12], [64, 48, 7], [24, 62, 6], [86, 70, 8], [40, 16, 6], [52, 80, 10], [8, 84, 5],
];

function sky(): HTMLElement {
  const art = el("div", "leader-sky");
  art.append(el("div", "leader-edge"));
  for (const [left, top, size] of STARS) {
    const star = el("span", "leader-star", "✦");
    star.style.left = `${left}%`;
    star.style.top = `${top}%`;
    star.style.fontSize = `${size}px`;
    art.append(star);
  }
  return art;
}

export function leaderCard(): HTMLElement {
  const card = el("div", "leader-card");
  const inner = el("div", "leader-inner");

  const back = el("div", "leader-face leader-back");
  back.append(sky());

  const front = el("div", "leader-face leader-front");
  const art = sky();
  art.append(el("span", "leader-number", "09"));
  const portrait = LUNA_PHOTOS.find((p) => p.name === "leader");
  if (portrait) art.append(photo(portrait));

  const panel = el("div", "leader-panel");
  panel.append(el("div", "leader-name", "Luna"), el("hr", "leader-rule"));
  for (const { name, text } of ABILITIES) {
    const line = el("p", "");
    line.append(el("b", "", name), ` ${text}`);
    panel.append(line);
  }
  const setup = el("div", "leader-setup");
  setup.append(...SETUP.map((s) => el("span", "", s)));
  panel.append(setup);

  front.append(art, panel);
  inner.append(back, front);
  card.append(inner);
  return card;
}
