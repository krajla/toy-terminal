import type { FsNode } from "../../fs/fs.ts";
import type { Session, TerminalApi } from "../../term/types.ts";
import { dispenseAt } from "./data.ts";
import { ADDRESS_KIBBLE, ADDRESS_SERVE_LOOP, formatAddress } from "./symbols.ts";

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

const SESSION_ADDRESS = 0xffffd5c0;
const word = (n: number) => `0x${formatAddress(n)}`;

// The daemon's crash handler runs gdb in batch mode and saves the output, as real services do. Every value is a
// 32-bit word in the byte order of the machine, so it pastes straight into a pattern offset tool.
function crashLog(name: Uint8Array, pointer: Uint8Array, eip: number): string {
  const memory = new Uint8Array(NAME_BYTES + pointer.length);
  memory.set(name);
  memory.set(pointer, NAME_BYTES);
  const view = new DataView(memory.buffer);
  const words = Array.from({ length: memory.length / 4 }, (_, i) => view.getUint32(i * 4, true));
  const rows: string[] = [];
  for (let i = 0; i < words.length; i += 4) {
    rows.push(`${word(SESSION_ADDRESS + i * 4)}:\t${words.slice(i, i + 4).map(word).join("\t")}`);
  }
  return [
    "lunad: caught SIGSEGV. Backtrace from gdb -batch:",
    "",
    "Program received signal SIGSEGV, Segmentation fault.",
    `${word(eip)} in ?? ()`,
    "(gdb) bt",
    `#0  ${word(eip)} in ?? ()`,
    `#1  ${word(ADDRESS_SERVE_LOOP + 0x3a)} in serve_loop ()`,
    "(gdb) info registers eip",
    `eip            ${word(eip)}          ${word(eip)}`,
    `(gdb) x/${words.length}wx &session`,
    ...rows,
  ].join("\n") + "\n";
}

function writeCrashLog(root: FsNode, content: string): void {
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
  lunad.children["crash.log"] = { kind: "file", content };
}

// The simulated struct: char name[32], then a function pointer. The name copy has no length check, so a name
// longer than the buffer writes past the buffer and over the pointer.
export class Daemon implements Session {
  readonly prompt = "lunad> ";
  readonly leaveOnInterrupt = true;
  readonly inputHint = "HELLO <name> · DISPENSE · HELP · ctrl+c to leave";

  private pointerBytes: Uint8Array;
  private readonly nameBytes = new Uint8Array(NAME_BYTES);
  private readonly root: FsNode;

  constructor(root: FsNode) {
    this.root = root;
    this.pointerBytes = new Uint8Array(4);
    new DataView(this.pointerBytes.buffer).setUint32(0, ADDRESS_KIBBLE, true);
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
    term.print(`ERR unknown command "${verb}". Try HELP.`, "err");
  }

  private help(term: TerminalApi): void {
    term.print("HELLO <name>   greet the daemon and store a name");
    term.print("DISPENSE       call the daemon's dispense pointer");
    term.print("HELP           show this message");
  }

  private hello(rawName: string, term: TerminalApi): void {
    if (!rawName) return term.print("ERR usage: HELLO <name>", "err");
    const bytes = decodeName(rawName);
    if (bytes === null) return term.print("ERR bad escape. Write a byte as \\x followed by two hex digits.", "err");
    this.nameBytes.fill(0);
    this.nameBytes.set(bytes.subarray(0, NAME_BYTES));
    const overflow = bytes.subarray(NAME_BYTES);
    if (overflow.length) {
      const over = overflow.subarray(0, this.pointerBytes.length);
      for (let i = 0; i < over.length; i++) {
        const byte = over[i];
        if (byte !== undefined) this.pointerBytes[i] = byte;
      }
    }
    term.print(`Hello, ${rawName}.`);
  }

  private async dispense(term: TerminalApi): Promise<void> {
    const pointer = new DataView(this.pointerBytes.buffer).getUint32(0, true);
    const sardine = await dispenseAt(pointer);
    if (sardine) {
      term.print("Dispensing: sardine.", "amber");
      term.print(sardine, "amber");
      return;
    }
    if (pointer === ADDRESS_KIBBLE) {
      term.print("Dispensing: kibble.");
      term.print("(Luna is not impressed. She likes sardines.)", "dim");
      return;
    }
    term.print("Segmentation fault (core dumped)", "err");
    writeCrashLog(this.root, crashLog(this.nameBytes, this.pointerBytes, pointer));
    term.pop();
  }
}
