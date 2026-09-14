import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.smoke.ts",
  use: {
    baseURL: "http://127.0.0.1:4321",
  },
  webServer: {
    command: "bun run preview --host 127.0.0.1 --port 4321",
    url: "http://127.0.0.1:4321/buy/",
    reuseExistingServer: !process.env.CI,
  },
});
