const KEY = "krajla.sardines";

export type KeyValueStore = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function browserStorage(): KeyValueStore | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

// Storage can be missing or throw (private mode, blocked cookies). Progress then lasts for the page only.
export class Progress {
  private readonly found: Set<string>;

  constructor(private readonly store: KeyValueStore | undefined = browserStorage()) {
    this.found = new Set(this.load());
  }

  has(id: string): boolean {
    return this.found.has(id);
  }

  add(id: string): void {
    this.found.add(id);
    try {
      this.store?.setItem(KEY, JSON.stringify([...this.found]));
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
