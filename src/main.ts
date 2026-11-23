import { Progress } from "./ctf/progress.ts";
import { ROOT } from "./fs/tree.ts";
import { YellowMark } from "./fun/yellow-mark.ts";
import { photo, POSES } from "./luna.ts";
import { ALL_COMMANDS } from "./shell/commands.ts";
import { Discoveries } from "./shell/discoveries.ts";
import { intro } from "./shell/intro.ts";
import { Shell } from "./shell/shell.ts";
import { Terminal } from "./term/terminal.ts";

function byId(id: string): HTMLElement {
  const el = document.getElementById(id);
  if (!el) throw new Error(`missing #${id}`);
  return el;
}

const input = byId("in");
if (!(input instanceof HTMLInputElement)) throw new Error("#in must be an <input>");

const term = new Terminal(
  {
    screen: byId("screen"),
    out: byId("out"),
    line: byId("line"),
    prompt: byId("prompt"),
    input,
  },
  new Shell(ALL_COMMANDS, ROOT, new Progress(), new YellowMark(), new Discoveries()),
);

const pose = POSES[Math.floor(Math.random() * POSES.length)];
if (pose) term.printNode(photo(pose));
intro(term);
term.focusAtTop();
