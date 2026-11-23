export function completeWord(word: string, candidates: readonly string[]): { word: string; matches: string[] } {
  const matches = candidates.filter((c) => c.startsWith(word)).toSorted();
  const [first] = matches;
  if (first === undefined) return { word, matches };
  if (matches.length === 1) return { word: first.endsWith("/") ? first : `${first} `, matches };
  let prefix = first;
  for (const m of matches) {
    while (!m.startsWith(prefix)) prefix = prefix.slice(0, -1);
  }
  return { word: prefix, matches };
}
