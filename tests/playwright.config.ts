import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  retries: 0,
  reporter: [["html"], ["list"]],
  use: {
    baseURL: "http://localhost:8787",
    trace: "on-first-retry",
  },
  // webServer disabled for production/mainnet testing
  // webServer: {
  //   command: "pnpm dev",
  //   port: 8787,
  //   reuseExistingServer: true,
  //   timeout: 15000,
  // },
});
