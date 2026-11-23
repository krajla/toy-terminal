import { expect, test } from "bun:test";
import { lookup } from "../../fs/fs.ts";
import { ROOT } from "../../fs/tree.ts";
import { fakeTerm, makeShell } from "../../test-helpers.ts";
import { FS_COMMANDS } from "../../shell/fs-commands.ts";
import { crontabCommand } from "./command.ts";

const content = (path: string) => {
  const node = lookup(ROOT, path);
  return node?.kind === "file" ? node.content : "";
};

test("the logs, the tool and the schedule are where the level points", async () => {
  expect(content("/home/guest/logs/zoomies-2026-11-07.log")).toStartWith("zoomies.log v1\n");
  expect(content("/home/guest/bin/zoomcrypt.go")).toContain("rand.NewSource(time.Now().Unix())");
  const { term, lines } = fakeTerm();
  await makeShell([crontabCommand]).run("crontab -l", term);
  expect(lines[0]?.text).toContain("CRON_TZ=UTC");
});

test("the encrypted log is base64 and does not show its text", () => {
  const bytes = Uint8Array.from(atob(content("/home/guest/logs/zoomies-2026-11-14.log.enc").trim()), (c) => c.charCodeAt(0));
  expect(bytes.length).toBeGreaterThan(100);
  expect(new TextDecoder().decode(bytes)).not.toContain("zoomies.log");
});

test("ls -l shows when zoomcrypt wrote the encrypted log", async () => {
  const { term, lines } = fakeTerm();
  await makeShell(FS_COMMANDS, ROOT).run("ls -l logs", term);
  expect(lines.map((l) => l.text)).toContain("-rw-r--r-- 1 guest guest 749 Nov 14 09:00 zoomies-2026-11-14.log.enc");
});
