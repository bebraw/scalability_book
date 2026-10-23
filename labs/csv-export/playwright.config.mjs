import { defineConfig } from "@playwright/test";
const port = Number(process.env.CSV_LAB_PORT || 4175);
export default defineConfig({
  testDir: "./browser",
  outputDir: "test-results/browser",
  workers: 1,
  retries: 0,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    browserName: "chromium",
    trace: "retain-on-failure",
    viewport: { width: 1000, height: 800 },
  },
  webServer: {
    command: "node server.mjs",
    env: { PORT: String(port) },
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
  },
});
