import { unseal } from "../../ctf/seal.ts";

// The flag is sealed with the address of dispense_sardine as the phrase. The daemon unseals it only after the
// pointer lands on dispense_sardine, so the flag exists nowhere else.
export const TARGET_PHRASE = "0000000000001044";

const SEALED_FLAG = "xXDM2hRfLZelvdpwLYxSNA4eYMMEli8BfOAPoO1KkYZflvN3Vdx9+uHkqWTKBY+Jp9xsH3hEYFue";

export const unsealFlag = (): Promise<string> => unseal(SEALED_FLAG, TARGET_PHRASE);
