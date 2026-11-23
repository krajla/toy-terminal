// The leaked symbol map for Luna's dispense daemon. The map is what the player reads to find the address of
// dispense_sardine; the daemon keeps the same addresses, so the map and the daemon cannot drift apart.

export interface SymbolEntry {
  address: bigint;
  name: string;
}

export const SYMBOLS: SymbolEntry[] = [
  { address: 0x0000000000000d88n, name: "parse_hello" },
  { address: 0x0000000000000e10n, name: "print_banner" },
  { address: 0x0000000000000f9an, name: "serve_loop" },
  { address: 0x0000000000001018n, name: "dispense_kibble" },
  { address: 0x0000000000001044n, name: "dispense_sardine" },
];

const byName = new Map(SYMBOLS.map((s) => [s.name, s.address]));

function must(name: string): bigint {
  const address = byName.get(name);
  if (address === undefined) throw new Error(`missing symbol ${name}`);
  return address;
}

export const ADDRESS_KIBBLE = must("dispense_kibble");
export const ADDRESS_SARDINE = must("dispense_sardine");

export function formatAddress(address: bigint): string {
  return address.toString(16).padStart(16, "0");
}

export function symbolsText(): string {
  return SYMBOLS.map((s) => `${formatAddress(s.address)} T ${s.name}`).join("\n");
}

export const MAP_TEXT = [
  "# lunad.map - leaked symbol map",
  "# Luna's dispense daemon",
  "# address         symbol",
  symbolsText(),
].join("\n") + "\n";
