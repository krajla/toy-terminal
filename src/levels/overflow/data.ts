import { unseal } from "../../ctf/seal.ts";
import { formatAddress } from "./symbols.ts";

// The flag is sealed with the address of dispense_sardine as the phrase, but the daemon never names that address.
// DISPENSE uses whatever the pointer holds as the phrase, and only the right address opens the seal.
const SEALED_FLAG = "hqPYkq+kGFSIXdpsH+U7N9i0fL0fuK4BEp7DpEe8Fz5c1BCAV+c6mgiMg5uyCmuq2v9885QPlBLj";

export async function dispenseAt(pointer: number): Promise<string | undefined> {
  try {
    return await unseal(SEALED_FLAG, formatAddress(pointer));
  } catch {
    return undefined;
  }
}
