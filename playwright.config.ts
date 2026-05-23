import { defineConfig, devices } from "@playwright/test";

const port = 3000;
const baseURL = `http://127.0.0.1:${port}`;
const testSecret =
  process.env.PLAYWRIGHT_AUTH_SECRET ??
  "playwright-local-only-fallback-secret-1234567890";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: `BETTER_AUTH_SECRET=${testSecret} BETTER_AUTH_URL=${baseURL} npm run build && BETTER_AUTH_SECRET=${testSecret} BETTER_AUTH_URL=${baseURL} npm start`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
