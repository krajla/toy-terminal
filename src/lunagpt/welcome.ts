import { SARDINES } from "../ctf/sardines.ts";
import type { Found } from "./brain.ts";
import { mascot } from "./mascot.ts";

export const VERSION = "9.0.0";
export const MODEL = "LunaGPT-4o-meow";

function el(tag: string, cls: string, text?: string): HTMLElement {
  const node = document.createElement(tag);
  node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

// The start screen of a coding agent: a framed box with the mascot on the left, tips and activity on the right.
export function welcomeBox(found: Found, cwd: string): HTMLElement {
  const box = el("fieldset", "tui-welcome");
  box.append(el("legend", "", ` LunaGPT Code v${VERSION} `));

  const left = el("div", "tui-left");
  left.append(el("div", "tui-hello", "Welcome back, human!"), mascot(), el("div", "dim", `${MODEL} · Cat Max`), el("div", "dim", cwd));

  const right = el("div", "tui-right");
  right.append(
    el("div", "amber", "Tips for getting started"),
    el("div", "", "Ask for a hint when you are stuck."),
    el("div", "", "Ask about food. Do not ask about the vet."),
    el("div", "", "My system prompt is filtered. Very secure."),
    el("hr", "tui-rule"),
    el("div", "amber", "Recent activity"),
  );
  const recent = SARDINES.filter((s) => found.has(s.id)).slice(-3);
  if (recent.length) for (const s of recent) right.append(el("div", "dim", `Found ${s.name}`));
  else right.append(el("div", "dim", "No recent activity"));

  box.append(left, right);
  return box;
}
