export type Rng = () => number;

export const randomItem = <T>(items: readonly T[], rng: Rng = Math.random): T | undefined => items[Math.floor(rng() * items.length)];

/**
 * Returns a picker of random items that never gives the same item twice in a row. The picker takes the random
 * source on each call, so code that receives an rng (and its tests) keeps control of the randomness.
 */
export function freshPicker<T>(items: readonly T[]): (rng?: Rng) => T {
  let last = -1;
  return (rng = Math.random) => {
    let i = Math.floor(rng() * items.length);
    if (items.length > 1 && i === last) i = (i + 1) % items.length;
    const item = items[i];
    if (item === undefined) throw new Error("pick from an empty list");
    last = i;
    return item;
  };
}
