export type Tier = "easy" | "medium" | "hard";

export interface Sardine {
  id: string;
  name: string;
  tier: Tier;
  sha256: string;
}

export const TIERS: Tier[] = ["easy", "medium", "hard"];

// Hashes come from scripts/hash-flag.ts. The flags themselves live only where players find them.
export const SARDINES: Sardine[] = [
  { id: "welcome", name: "the welcome mat", tier: "easy", sha256: "e2759bbc9edc90c636e8ffa1594d585a1ca32c233f47d1318a53c8de7a6685d9" },
  { id: "dotfile", name: "the dotfile", tier: "easy", sha256: "d26acd19e9e7bd7e79c590fccee3589803013f902ad31cd5e397e74dd7d84472" },
  { id: "robots", name: "the tax return", tier: "easy", sha256: "11c5cb6da3a529b38c431b6e8a692bda119cb6a25e64490f5253611e0911b44d" },
  { id: "header", name: "the header", tier: "easy", sha256: "28f86bc63437eb4b4047fceeb8ccf2496eacc8ebc4870f58dc9863ed9a6430cc" },
];

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function findSardine(flag: string): Promise<Sardine | undefined> {
  const hash = await sha256Hex(flag.trim());
  return SARDINES.find((s) => s.sha256 === hash);
}
