export type Tier = "easy" | "medium" | "hard";

export interface Sardine {
  id: string;
  name: string;
  tier: Tier;
  sha256: string;
}

export const TIERS: Tier[] = ["easy", "medium", "hard"];

// Hashes come from scripts/hash-flag.ts or scripts/seal.ts. Easy flags sit in plain text where players find them.
// Medium and hard flags exist only as sealed text or as the output of a solved level.
export const SARDINES: Sardine[] = [
  { id: "welcome", name: "the welcome mat", tier: "easy", sha256: "e2759bbc9edc90c636e8ffa1594d585a1ca32c233f47d1318a53c8de7a6685d9" },
  { id: "dotfile", name: "the dotfile", tier: "easy", sha256: "d26acd19e9e7bd7e79c590fccee3589803013f902ad31cd5e397e74dd7d84472" },
  { id: "robots", name: "the tax return", tier: "easy", sha256: "11c5cb6da3a529b38c431b6e8a692bda119cb6a25e64490f5253611e0911b44d" },
  { id: "header", name: "the header", tier: "easy", sha256: "28f86bc63437eb4b4047fceeb8ccf2496eacc8ebc4870f58dc9863ed9a6430cc" },
  { id: "sqlite", name: "the stash", tier: "medium", sha256: "00f48718cd820713099db9122a3b849cf8e69803048c0139112ebde439aa11c5" },
  { id: "case-file", name: "the case file", tier: "medium", sha256: "d4eb96378ad70483fd68ab4e870d0e8b4e2be011aae6948e468e9eba4d0574ef" },
  { id: "night", name: "the night vision", tier: "medium", sha256: "52d8dfd6e02b2aade597556227dbc07ec555ef89320d0e206f3dff654c1d71e6" },
  // This flag sits in the public git history of the site, in a commit that a later commit reverts.
  { id: "git-history", name: "the leaked key", tier: "hard", sha256: "2115da2f24f39c5b76576ed31eadf6d87e3f046c6e0b1b3495b8a6ec6dfa53d6" },
];

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function findSardine(flag: string): Promise<Sardine | undefined> {
  const hash = await sha256Hex(flag.trim());
  return SARDINES.find((s) => s.sha256 === hash);
}
