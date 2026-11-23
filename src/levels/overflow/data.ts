import { unseal } from "../../ctf/seal.ts";

// The flag is sealed with the address of dispense_sardine as the phrase. The daemon unseals it only after the
// pointer lands on dispense_sardine, so the flag exists nowhere else.
export const TARGET_PHRASE = "080492e1";

const SEALED_FLAG = "hqPYkq+kGFSIXdpsH+U7N9i0fL0fuK4BEp7DpEe8Fz5c1BCAV+c6mgiMg5uyCmuq2v9885QPlBLj";

export const unsealFlag = (): Promise<string> => unseal(SEALED_FLAG, TARGET_PHRASE);
