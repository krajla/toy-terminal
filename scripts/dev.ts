import { join, normalize } from "node:path";
import index from "../index.html";

const PUBLIC = join(import.meta.dir, "..", "public");

interface HeaderRule {
  pattern: RegExp;
  headers: [string, string][];
}

// Reads the Cloudflare Pages _headers file, so the dev server sends the same custom headers as production.
async function loadHeaderRules(): Promise<HeaderRule[]> {
  const file = Bun.file(join(PUBLIC, "_headers"));
  if (!(await file.exists())) return [];
  const rules: HeaderRule[] = [];
  for (const line of (await file.text()).split("\n")) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      const source = line.trim().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replaceAll("*", ".*");
      rules.push({ pattern: new RegExp(`^${source}$`), headers: [] });
      continue;
    }
    const colon = line.indexOf(":");
    rules.at(-1)?.headers.push([line.slice(0, colon).trim(), line.slice(colon + 1).trim()]);
  }
  return rules;
}

async function serveStatic(path: string): Promise<Response> {
  const file = Bun.file(join(PUBLIC, path.endsWith("/") ? `${path}index.html` : path));
  if (!(await file.exists())) {
    const dirIndex = await Bun.file(join(PUBLIC, path, "index.html")).exists();
    return dirIndex ? Response.redirect(`${path}/`, 308) : new Response("Not found", { status: 404 });
  }
  const response = new Response(file);
  for (const rule of await loadHeaderRules()) {
    if (rule.pattern.test(path)) for (const [name, value] of rule.headers) response.headers.set(name, value);
  }
  return response;
}

const server = Bun.serve({
  port: Number(process.env.PORT ?? 3000),
  development: { hmr: true, console: true },
  routes: { "/": index },
  fetch: (req) => serveStatic(normalize(decodeURIComponent(new URL(req.url).pathname))),
});

console.log(`dev server on ${server.url}`);
