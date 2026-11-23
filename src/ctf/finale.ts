import { FINALE } from "./finale-data.ts";
import { SARDINES } from "./sardines.ts";
import { fromBase64 } from "./seal.ts";

// The key comes from the proofs of the hard sardines, in registry order. scripts/finale-seal.ts uses the same order,
// so a new hard sardine needs a new seal of the finale.
export const FINALE_IDS = SARDINES.filter((s) => s.tier === "hard").map((s) => s.id);

export async function finaleKey(proofs: string[], salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  const secret = await crypto.subtle.importKey("raw", new TextEncoder().encode(proofs.join(":")), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, secret, { name: "AES-GCM", length: 256 }, false, [
    "encrypt",
    "decrypt",
  ]);
}

/** The finale message, or undefined when the proofs do not open it. */
export async function openFinale(proofs: string[]): Promise<string | undefined> {
  const sealed = fromBase64(FINALE.sealed);
  try {
    const key = await finaleKey(proofs, fromBase64(FINALE.salt), FINALE.iterations);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: sealed.subarray(0, 12) }, key, sealed.subarray(12));
    return new TextDecoder().decode(plain);
  } catch {
    return undefined;
  }
}
