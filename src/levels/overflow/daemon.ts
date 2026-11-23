import type { FsNode } from "../../fs/fs.ts";
import type { Session, TerminalApi } from "../../term/types.ts";
import { unsealFlag } from "./data.ts";
import { ADDRESS_KIBBLE, ADDRESS_SARDINE, formatAddress, symbolsText } from "./symbols.ts";

const NAME_BYTES = 32;

function decodeName(raw: string): Uint8Array | null {
  const bytes: number[] = [];
  let i = 0;
  let segmentStart = 0;
  while (i < raw.length) {
    if (raw[i] === "\\") {
      if (i > segmentStart) bytes.push(...new TextEncoder().encode(raw.slice(segmentStart, i)));
      const hex = raw.slice(i + 2, i + 4);
      if (!raw.startsWith("\\x", i) || !/^[0-9a-fA-F]{2}$/.test(hex)) return null;
      bytes.push(parseInt(hex, 16));
      i += 4;
      segmentStart = i;
      continue;
    }
    i++;
  }
  if (segmentStart < raw.length) bytes.push(...new TextEncoder().encode(raw.slice(segmentStart)));
  return new Uint8Array(bytes);
}

function crashDump(reason: string, detail: string): string {
  return [
    "# lunad.core - crash dump",
    "# lunad - Luna's dispense daemon",
    "# signal 11 (SIGSEGV): Segmentation fault",
    `# cause: ${reason}`,
    `# detail: ${detail}`,
    "# Symbol map (leaked by the daemon):",
    symbolsText(),
  ].join("\n") + "\n";
}

function writeCrashDump(root: FsNode, content: string): void {
  if (root.kind !== "dir") return;
  const home = root.children.home;
  if (home?.kind !== "dir") return;
  const guest = home.children.guest;
  if (guest?.kind !== "dir") return;
  let lunad = guest.children.lunad;
  if (lunad === undefined) {
    lunad = { kind: "dir", children: {} };
    guest.children.lunad = lunad;
  }
  if (lunad.kind !== "dir") return;
  lunad.children["lunad.core"] = { kind: "file", content };
}

// The simulated struct: char name[32], then a function pointer. The name copy has no length check, so a name
// longer than the buffer writes past the buffer and over the pointer.
export class Daemon implements Session {
  readonly prompt = "lunad> ";
  readonly leaveOnInterrupt = true;
  readonly inputHint = "HELLO <name> · DISPENSE · HELP · ctrl+c to leave";

  private pointerBytes: Uint8Array;
  private readonly root: FsNode;

  constructor(root: FsNode) {
    this.root = root;
    this.pointerBytes = new Uint8Array(8);
    new DataView(this.pointerBytes.buffer).setBigUint64(0, ADDRESS_KIBBLE, true);
  }

  async run(line: string, term: TerminalApi): Promise<void> {
    const trimmed = line.trim();
    if (!trimmed) return;
    const space = trimmed.indexOf(" ");
    const verb = space < 0 ? trimmed : trimmed.slice(0, space);
    const rest = space < 0 ? "" : trimmed.slice(space + 1);
    if (verb === "HELP") return this.help(term);
    if (verb === "HELLO") return this.hello(rest, term);
    if (verb === "DISPENSE") return this.dispense(term);
    return this.crash(term, "unknown command", trimmed);
  }

  private help(term: TerminalApi): void {
    term.print("HELLO <name>   greet the daemon and store a name");
    term.print("DISPENSE       call the daemon's dispense pointer");
    term.print("HELP           show this message");
  }

  private hello(rawName: string, term: TerminalApi): void {
    if (!rawName) return this.crash(term, "HELLO with no name", "HELLO");
    const bytes = decodeName(rawName);
    if (bytes === null) return this.crash(term, "undecodable name", rawName);
    const overflow = bytes.subarray(NAME_BYTES);
    if (overflow.length) {
      const over = overflow.subarray(0, 8);
      for (let i = 0; i < over.length; i++) {
        const byte = over[i];
        if (byte !== undefined) this.pointerBytes[i] = byte;
      }
    }
    term.print(`Hello, ${rawName}.`);
  }

  private async dispense(term: TerminalApi): Promise<void> {
    const pointer = new DataView(this.pointerBytes.buffer).getBigUint64(0, true);
    if (pointer === ADDRESS_SARDINE) {
      term.print("Dispensing: sardine.", "amber");
      term.print(await unsealFlag(), "amber");
      return;
    }
    if (pointer === ADDRESS_KIBBLE) {
      term.print("Dispensing: kibble.");
      term.print("(Luna is not impressed. She likes sardines.)", "dim");
      return;
    }
    return this.crash(term, "call through the pointer", formatAddress(pointer));
  }

  private crash(term: TerminalApi, reason: string, detail: string): void {
    term.print("Segmentation fault (core dumped)", "err");
    writeCrashDump(this.root, crashDump(reason, detail));
    term.pop();
  }
}
