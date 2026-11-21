export interface Cell {
  text: string;
  cls?: string;
}

export interface Part extends Cell {
  href?: string;
  /** An image in place of the text, which becomes its alt text. */
  img?: string;
}

export interface Live {
  set(text: string, cls?: string): void;
  setParts(parts: Cell[], cls?: string): void;
}

export interface Output {
  print(text?: string, cls?: string): void;
  printParts(parts: Part[]): void;
  printNode(node: Node): void;
  printColumns(cells: Cell[]): void;
  live(): Live;
  /** A live block sized to fit `cols` characters in the screen width. Square cells for 1:1 pieces. */
  scene(cols: number, square: boolean): Live;
  clear(): void;
}

export class Interrupted extends Error {}

export interface TerminalApi extends Output {
  push(session: Session): void;
  pop(): void;
  history(): readonly string[];
  /** Rejects with Interrupted when the player presses Ctrl+C. */
  sleep(ms: number): Promise<void>;
  effect(cls: string, ms: number): void;
}

export interface Completion {
  line: string;
  options: string[];
}

export interface Session {
  readonly prompt: string;
  /** The prompt with styled parts. Without it, the terminal shows `prompt` in the prompt colour. */
  promptParts?(): Part[];
  /** Text that takes over the next input line: each key the player presses types its next character instead. */
  possession?(): string | undefined;
  run(line: string, term: TerminalApi): void | Promise<void>;
  complete?(line: string): Completion;
}
