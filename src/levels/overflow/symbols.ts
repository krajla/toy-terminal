// The leaked symbol map for Luna's dispense daemon, a 32-bit binary. The map is what the player reads to find the
// address of dispense_sardine; the daemon keeps the same addresses, so the map and the daemon cannot drift apart.

export interface SymbolEntry {
  address: number;
  name: string;
}

export const SYMBOLS: SymbolEntry[] = [
  { address: 0x08049196, name: "print_banner" },
  { address: 0x080491d2, name: "parse_hello" },
  { address: 0x0804924c, name: "serve_loop" },
  { address: 0x080492a8, name: "dispense_kibble" },
  { address: 0x080492e1, name: "dispense_sardine" },
];

const byName = new Map(SYMBOLS.map((s) => [s.name, s.address]));

function must(name: string): number {
  const address = byName.get(name);
  if (address === undefined) throw new Error(`missing symbol ${name}`);
  return address;
}

export const ADDRESS_KIBBLE = must("dispense_kibble");
export const ADDRESS_SARDINE = must("dispense_sardine");
export const ADDRESS_SERVE_LOOP = must("serve_loop");

export function formatAddress(address: number): string {
  return address.toString(16).padStart(8, "0");
}

export function symbolsText(): string {
  return SYMBOLS.map((s) => `${formatAddress(s.address)} T ${s.name}`).join("\n");
}

export const MAP_TEXT = [
  "# lunad.map - leaked symbol map",
  "# Luna's dispense daemon (ELF 32-bit, i386)",
  "# address symbol",
  symbolsText(),
].join("\n") + "\n";
