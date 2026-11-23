// An Arcs leader card that is dealt face down and turns over once. The back is drawn in CSS. The front is the
// Agitator card with Luna in it, made by scripts/arcs-leader.ts.

function el(tag: string, cls: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Cross-shaped stars on the card back, as [left %, top %, size px].
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
  const img = document.createElement("img");
  img.src = "/luna/arcs-leader.png";
  img.alt = "Luna as an Arcs leader: Sits On It, and Knocks Things Over.";
  front.append(img);
  inner.append(back, front);
  card.append(inner);
  return card;
}
