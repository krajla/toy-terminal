import { History } from "./history.ts";
import { Interrupted, type Cell, type Live, type Part, type Session, type TerminalApi } from "./types.ts";

export interface TerminalElements {
  screen: HTMLElement;
  out: HTMLElement;
  line: HTMLElement;
  prompt: HTMLElement;
  input: HTMLInputElement;
}

const POSSESSED_STEP = 3;

function partElement({ text, cls, href, img }: Part): HTMLElement {
  if (img) {
    const image = document.createElement("img");
    image.src = img;
    image.alt = text;
    if (cls) image.className = cls;
    return image;
  }
  const el = document.createElement(href ? "a" : "span");
  el.textContent = text;
  if (cls) el.className = cls;
  if (el instanceof HTMLAnchorElement && href) {
    el.href = href;
    el.target = "_blank";
    el.rel = "noopener";
  }
  return el;
}

export class Terminal implements TerminalApi {
  private readonly sessions: Session[] = [];
  private readonly histories = new WeakMap<Session, History>();
  private busy = false;
  private possessed: string | undefined;
  private possessedKeys = 0;
  private abort = new AbortController();

  constructor(private readonly el: TerminalElements, root: Session) {
    this.sessions.push(root);
    el.input.addEventListener("keydown", (e) => this.onKey(e));
    el.input.addEventListener("input", () => {
      if (!this.possessed) return;
      // Each key types POSSESSED_STEP characters of the song, and each backspace takes them back.
      const shown = this.possessed.slice(0, this.possessedKeys * POSSESSED_STEP);
      this.possessedKeys = Math.max(0, this.possessedKeys + (el.input.value.length > shown.length ? 1 : -1));
      this.setInput(this.possessed.slice(0, this.possessedKeys * POSSESSED_STEP));
    });
    // The input line is hidden while a command runs, so Ctrl+C for a running command comes from the window.
    window.addEventListener("keydown", (e) => {
      if (this.busy && e.ctrlKey && e.key === "c") {
        e.preventDefault();
        this.abort.abort();
      }
    });
    el.screen.addEventListener("click", () => {
      if (!window.getSelection()?.toString()) el.input.focus();
    });
    this.render();
  }

  print(text = "", cls?: string): void {
    const row = document.createElement("div");
    row.className = cls ? `row ${cls}` : "row";
    row.textContent = text;
    this.el.out.append(row);
    this.scroll();
  }

  printParts(parts: Part[]): void {
    const row = document.createElement("div");
    row.className = "row";
    row.append(...parts.map(partElement));
    this.printNode(row);
  }

  live(): Live {
    const row = document.createElement("div");
    row.className = "row";
    this.printNode(row);
    return {
      set: (text, cls) => {
        row.textContent = text;
        row.className = cls ? `row ${cls}` : "row";
        this.scroll();
      },
      setParts: (parts, cls) => {
        row.replaceChildren(
          ...parts.map(({ text, cls: partCls }) => {
            if (!partCls) return text;
            const span = document.createElement("span");
            span.className = partCls;
            span.textContent = text;
            return span;
          }),
        );
        row.className = cls ? `row ${cls}` : "row";
        this.scroll();
      },
    };
  }

  scene(cols: number, square: boolean): Live {
    const live = this.live();
    const row = this.el.out.lastElementChild;
    if (row instanceof HTMLElement) row.style.setProperty("--cols", String(cols));
    const sceneCls = (cls?: string) => `scene${square ? " square" : ""}${cls ? ` ${cls}` : ""}`;
    return {
      set: (text, cls) => live.set(text, sceneCls(cls)),
      setParts: (parts, cls) => live.setParts(parts, sceneCls(cls)),
    };
  }

  sleep(ms: number): Promise<void> {
    const { signal } = this.abort;
    return new Promise((resolve, reject) => {
      if (signal.aborted) return reject(new Interrupted());
      const timer = setTimeout(resolve, ms);
      signal.addEventListener("abort", () => {
        clearTimeout(timer);
        reject(new Interrupted());
      }, { once: true });
    });
  }

  effect(cls: string, ms: number): void {
    this.el.screen.classList.add(cls);
    setTimeout(() => this.el.screen.classList.remove(cls), ms);
  }

  printNode(node: Node): void {
    this.el.out.append(node);
    this.scroll();
  }

  printColumns(cells: Cell[]): void {
    const grid = document.createElement("div");
    grid.className = "row cols";
    const widest = Math.max(0, ...cells.map((c) => c.text.length));
    grid.style.setProperty("--col", `${widest + 2}ch`);
    for (const { text, cls } of cells) {
      const span = document.createElement("span");
      span.textContent = text;
      if (cls) span.className = cls;
      grid.append(span);
    }
    this.printNode(grid);
  }

  clear(): void {
    this.el.out.replaceChildren();
  }

  push(session: Session): void {
    this.sessions.push(session);
    this.render();
  }

  pop(): void {
    if (this.sessions.length > 1) this.sessions.pop();
    this.render();
  }

  history(): readonly string[] {
    return this.currentHistory.list();
  }

  focus(): void {
    this.el.input.focus();
  }

  private get session(): Session {
    // The root session is pushed in the constructor and pop() never removes it.
    return this.sessions.at(-1) as Session;
  }

  private promptParts(session: Session): Part[] {
    return session.promptParts?.() ?? [{ text: session.prompt, cls: "prompt" }];
  }

  private get currentHistory(): History {
    let h = this.histories.get(this.session);
    if (!h) {
      h = new History();
      this.histories.set(this.session, h);
    }
    return h;
  }

  private render(): void {
    this.el.prompt.replaceChildren(...this.promptParts(this.session).map(partElement));
    this.el.line.hidden = this.busy;
    if (!this.busy) {
      this.possessed = this.session.possession?.();
      this.possessedKeys = 0;
    }
    if (!this.busy) this.el.input.focus();
    this.scroll();
  }

  private scroll(): void {
    this.el.screen.scrollTop = this.el.screen.scrollHeight;
  }

  private setInput(value: string): void {
    const { input } = this.el;
    input.value = value;
    input.setSelectionRange(value.length, value.length);
  }

  private onKey(e: KeyboardEvent): void {
    if (this.busy) return;
    const { input } = this.el;

    if (e.key === "Enter") {
      e.preventDefault();
      void this.submit(input.value);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = this.currentHistory.up(input.value);
      if (prev !== undefined) this.setInput(prev);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = this.currentHistory.down();
      if (next !== undefined) this.setInput(next);
    } else if (e.key === "Tab") {
      e.preventDefault();
      this.complete();
    } else if (e.ctrlKey && e.key === "d") {
      // Like a real shell: Ctrl+D on an empty line ends a sub-session, such as the sqlite kiosk.
      e.preventDefault();
      if (input.value || this.sessions.length < 2) return;
      this.printParts([...this.promptParts(this.session)]);
      this.pop();
    } else if (e.ctrlKey && e.key === "l") {
      e.preventDefault();
      this.clear();
    } else if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      this.printParts([...this.promptParts(this.session), { text: `${input.value}^C` }]);
      this.setInput("");
      this.currentHistory.reset();
    }
  }

  private complete(): void {
    const { input } = this.el;
    const result = this.session.complete?.(input.value);
    if (!result) return;
    if (result.line !== input.value) {
      this.setInput(result.line);
    } else if (result.options.length > 1) {
      this.printParts([...this.promptParts(this.session), { text: input.value }]);
      this.printColumns(result.options.map((text) => ({ text })));
    }
  }

  private async submit(line: string): Promise<void> {
    const session = this.session;
    this.printParts([...this.promptParts(session), { text: line }]);
    this.currentHistory.add(line);
    this.setInput("");
    this.busy = true;
    this.abort = new AbortController();
    this.render();
    try {
      await session.run(line, this);
    } catch (err) {
      if (err instanceof Interrupted) this.print("^C", "dim");
      else this.print(`error: ${err instanceof Error ? err.message : String(err)}`, "err");
    } finally {
      this.busy = false;
      this.render();
    }
  }
}
