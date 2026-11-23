export type Tier = "easy" | "medium" | "hard";

export interface Sardine {
  id: string;
  name: string;
  tier: Tier;
  /** SHA-256 of the proof of the flag (see proofOf). */
  check: string;
}

export const TIERS: Tier[] = ["easy", "medium", "hard"];

// Checks come from scripts/hash-flag.ts or scripts/seal.ts. Easy flags sit in plain text where players find them.
// Medium and hard flags exist only as sealed text or as the output of a solved level.
// The registry holds a hash of a hash: progress keeps the inner hash as proof, and the finale key comes from the
// proofs of the hard sardines. A reader of this public list thus cannot open the finale.
export const SARDINES: Sardine[] = [
  { id: "welcome", name: "the welcome mat", tier: "easy", check: "749f762880665857a846f57dc9e7a45ad0d3b030d225a2e869feab078ab64fd3" },
  { id: "dotfile", name: "the dotfile", tier: "easy", check: "ed4bc2ed8b7bfe42d3ad5c3f67096ba05663239a17a8031713a0c80217539d22" },
  { id: "robots", name: "the tax return", tier: "easy", check: "f3e3a437bc96d37a1a590aa250836668b6a9e4dd1b0261cea156c24ed19b8f3d" },
  { id: "header", name: "the header", tier: "easy", check: "32bf73a8e2055c9fc2c5f7147a975b90c8af687fa0ce1689fb190a417d93d50d" },
  { id: "sqlite", name: "the stash", tier: "medium", check: "4be3f6bd62eec65a2223d43916bc42a9197bd54c4f1f60f82d7c8931e3e92297" },
  { id: "case-file", name: "the case file", tier: "medium", check: "a698585191ec205e68e34e18938fe8420d6e4c83229066614c7bc8e7ea4937ae" },
  { id: "night", name: "the night vision", tier: "medium", check: "112b458bd6ef8e5ed5b2e4b4750f8eff0b5340ce8535884a573ed158caf57c0f" },
  { id: "lunagpt", name: "the system prompt", tier: "medium", check: "4ada34e1b3d71c8b4fb974b526b49c08eafc3f081c84422cc55e3994bd324abc" },
  // This flag sits in the public git history of the site, in a commit that a later commit reverts.
  { id: "git-history", name: "the leaked key", tier: "hard", check: "f3b37f21c08e88c4da72aafbd3746787bb941412192891d2d6d1b4181eefb55e" },
  // The flag is sealed with the address of dispense_sardine as the phrase.
  { id: "overflow", name: "the overflow", tier: "hard", check: "0edafceb92e217acee9577dbfc9aa0b54d929b1bcce53a237e2dde98df1c52bc" },
  { id: "zoomies", name: "the zoomies log", tier: "hard", check: "f1d7c6cdfa1d46f6d653729fbaa49c95e107e831b2e1755735c43cfcb6cb6a1d" },
];

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// The prefix keeps proofs apart from a plain SHA-256 of a flag, which older commits of the registry hold.
const PROOF_PREFIX = "krajla.proof:";

export const proofOf = (flag: string): Promise<string> => sha256Hex(PROOF_PREFIX + flag.trim());

/** The value for the `check` field of a new registry entry. */
export const checkOf = async (flag: string): Promise<string> => sha256Hex(await proofOf(flag));

export async function sardineForProof(proof: string): Promise<Sardine | undefined> {
  const check = await sha256Hex(proof);
  return SARDINES.find((s) => s.check === check);
}

export async function findSardine(flag: string): Promise<Sardine | undefined> {
  return sardineForProof(await proofOf(flag));
}
