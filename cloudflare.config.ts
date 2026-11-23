// Deploy settings for the static site. Deploy with: bun run deploy
import { defineConfig } from "cf/config";

export default defineConfig({
  worker: {
    name: "krajla-space",
    compatibilityDate: "2026-11-19",
    domains: ["luna.krajla.space"],
    // The workers.dev address holds the name of the account, so the site is only served on its own domain.
    workersDev: false,
  },
});
