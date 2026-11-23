import type { Command } from "../../shell/shell.ts";
import { Daemon } from "./daemon.ts";

export const nc: Command = {
  name: "nc",
  summary: "connect to a daemon",
  hidden: true,
  run(args, term, shell) {
    const [host, port] = args;
    if (host === "localhost" && port === "1337") {
      term.print("lunad - Luna's dispense daemon");
      term.print("A very small daemon that dispenses treats on request.");
      term.print('Enter "HELP" for the protocol.');
      term.push(new Daemon(shell.root));
      return;
    }
    if (!args.length) return term.print("usage: nc <host> <port>", "dim");
    return term.print(`nc: connect to ${host ?? "localhost"} port ${port ?? "1337"} failed: Luna is not listening.`, "err");
  },
};
