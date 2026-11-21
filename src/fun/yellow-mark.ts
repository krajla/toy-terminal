import { browserStorage, type KeyValueStore } from "../ctf/progress.ts";

const KEY = "krajla.yellow-sign";
const ROLLS_KEY = "krajla.delta-green-rolls";
// The first Delta Green rolls never show the Sign, so a new player sees the plain game first.
const SAFE_ROLLS = 2;

// Set the first time a roll shows the Yellow Sign. From then on every roll shows it, the prompt carries it,
// and Cassilda's Song turns up now and then, until the player types `unmask`.
export class YellowMark {
  private marked = false;
  private deltaGreenRolls = 0;

  constructor(private readonly store: KeyValueStore | undefined = browserStorage()) {
    try {
      this.marked = store?.getItem(KEY) === "1";
      this.deltaGreenRolls = Number(store?.getItem(ROLLS_KEY)) || 0;
    } catch {}
  }

  /** True once the player has made enough Delta Green rolls for the Sign to appear. */
  get signAllowed(): boolean {
    return this.deltaGreenRolls >= SAFE_ROLLS;
  }

  countDeltaGreenRoll(): void {
    this.deltaGreenRolls++;
    try {
      this.store?.setItem(ROLLS_KEY, String(this.deltaGreenRolls));
    } catch {}
  }

  get has(): boolean {
    return this.marked;
  }

  set(marked: boolean): void {
    this.marked = marked;
    try {
      if (marked) this.store?.setItem(KEY, "1");
      else this.store?.removeItem(KEY);
    } catch {}
  }
}
