export class History {
  private entries: string[] = [];
  private cursor = 0;
  private draft = "";

  constructor(private readonly limit = 500) {}

  add(line: string): void {
    if (line.trim() && line !== this.entries.at(-1)) {
      this.entries.push(line);
      if (this.entries.length > this.limit) this.entries.shift();
    }
    this.reset();
  }

  reset(): void {
    this.cursor = this.entries.length;
    this.draft = "";
  }

  up(current: string): string | undefined {
    if (this.cursor === this.entries.length) this.draft = current;
    if (this.cursor === 0) return undefined;
    this.cursor--;
    return this.entries[this.cursor];
  }

  down(): string | undefined {
    if (this.cursor >= this.entries.length) return undefined;
    this.cursor++;
    return this.cursor === this.entries.length ? this.draft : this.entries[this.cursor];
  }

  list(): readonly string[] {
    return this.entries;
  }
}
