import type { Command } from "../../shell/shell.ts";

// The terminal has no network. These commands say so, and send the player to a real resolver on their own machine.
const resolver = (name: string): Command => ({
  name,
  summary: "query DNS",
  hidden: true,
  run(args, term) {
    term.print(`;; ${name} ${args.join(" ")}`.trimEnd(), "dim");
    term.print(";; communications error: this terminal has no network. Luna unplugged it.", "err");
    term.print(";; Ask a real resolver, from your own machine.", "dim");
  },
});

export const DNS_COMMANDS: Command[] = [resolver("dig"), resolver("host"), resolver("nslookup")];
