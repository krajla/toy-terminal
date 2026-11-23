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
// Each found sardine maps to its proof, the SHA-256 of the flag. The finale needs the proofs, not the flags.
export class Progress {
  private readonly found: Map<string, string>;

  constructor(private readonly store: KeyValueStore | undefined = browserStorage()) {
    this.found = new Map(this.load());
  }

  has(id: string): boolean {
    return this.found.has(id);
  }

  proof(id: string): string | undefined {
    return this.found.get(id);
  }

  add(id: string, proof: string): void {
    this.found.set(id, proof);
    try {
      this.store?.setItem(KEY, JSON.stringify(Object.fromEntries(this.found)));
    } catch {}
  }

  private load(): [string, string][] {
    try {
      const parsed: unknown = JSON.parse(this.store?.getItem(KEY) ?? "{}");
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return [];
      return Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === "string");
    } catch {
      return [];
    }
  }
}
