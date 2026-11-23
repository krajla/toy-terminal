// Vigenère over the letters A-Z. Case, digits and punctuation pass through, and the key moves on letters only.
function shift(text: string, key: string, sign: 1 | -1): string {
  const k = key.toUpperCase().replace(/[^A-Z]/g, "");
  if (!k) throw new Error("the key has no letters");
  let i = 0;
  return text.replace(/[A-Za-z]/g, (ch) => {
    const base = ch <= "Z" ? 65 : 97;
    const by = (k.charCodeAt(i++ % k.length) - 65) * sign;
    return String.fromCharCode(((ch.charCodeAt(0) - base + by + 26) % 26) + base);
  });
}

export const encipher = (text: string, key: string) => shift(text, key, 1);
export const decipher = (text: string, key: string) => shift(text, key, -1);
