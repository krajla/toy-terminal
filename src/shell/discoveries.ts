import { browserStorage, type KeyValueStore } from "../ctf/progress.ts";

const KEY = "krajla.found-commands";

// The hidden commands that the player has found, by running them or as a reward for a sardine.
// Storage can be missing or throw. The list then lasts for the page only.
export class Discoveries {
  private readonly names: Set<string>;

  constructor(private readonly store: KeyValueStore | undefined = browserStorage()) {
    this.names = new Set(this.load());
  }

  has(name: string): boolean {
    return this.names.has(name);
  }

  add(name: string): void {
    if (this.names.has(name)) return;
    this.names.add(name);
    try {
      this.store?.setItem(KEY, JSON.stringify([...this.names]));
    } catch {}
  }

  private load(): string[] {
    try {
      const parsed: unknown = JSON.parse(this.store?.getItem(KEY) ?? "[]");
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
    } catch {
      return [];
    }
  }
}
