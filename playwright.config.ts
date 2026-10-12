import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: {
    baseURL: "http://localhost:3100",
    channel: "msedge",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "node tests/start-server.mjs",
    url: "http://localhost:3100",
    reuseExistingServer: false,
    timeout: 180000,
  },
});
