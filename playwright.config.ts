import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT || 3100);
const localDataDir = process.env.E2E_LOCAL_DATA_DIR || ".local-e2e";
const buildDir = process.env.E2E_BUILD_DIR || `.dev-build-e2e-${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "on-first-retry",
    viewport: { width: 1280, height: 900 },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `PORT=${port} BUILD_DIR=${buildDir} LOCAL_DATA_DIR=${localDataDir} RESET_LOCAL_COMMENTS=1 npm run dev`,
    url: `http://127.0.0.1:${port}/chapters/introduction/`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
