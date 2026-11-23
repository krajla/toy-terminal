// AES-GCM with a key derived from a phrase that the level reveals as it is solved. A reader of the source can
// follow it, but a search of the bundle for "sardine{" finds nothing.

export const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
export const fromBase64 = (text: string) => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function keyFor(phrase: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(phrase));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

export async function seal(text: string, phrase: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, await keyFor(phrase), new TextEncoder().encode(text)));
  const out = new Uint8Array(iv.length + data.length);
  out.set(iv);
  out.set(data, iv.length);
  return toBase64(out);
}

export async function unseal(sealed: string, phrase: string): Promise<string> {
  const bytes = fromBase64(sealed);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes.subarray(0, 12) }, await keyFor(phrase), bytes.subarray(12));
  return new TextDecoder().decode(plain);
}
