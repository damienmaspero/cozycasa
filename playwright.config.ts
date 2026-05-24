import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

// Playwright smoke-test config: chromium-only, drives the built web app
// served by `npm start` (which serves `dist/` via `src/server.ts`).
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  timeout: 30_000,
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm start",
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    // Building the Expo web bundle from a cold cache can take a while.
    timeout: 5 * 60 * 1000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      PORT: String(PORT),
    },
  },
});
