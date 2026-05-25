import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

// Use a dedicated SQLite database file for each Playwright run so the
// bootstrap sign-up gate in `src/auth-signup-gate.ts` sees an empty `user`
// table at the start of the run (the very first sign-up is the one we want
// to exercise in `e2e/signup-first-user.spec.ts`). The `data/` directory is
// gitignored, and a unique path per run avoids stepping on a developer's
// local `./data/app.db` or on previous E2E runs.
const DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? `./data/e2e-${Date.now()}.db`;

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
      DATABASE_URL,
      // better-auth requires a secret; provide a deterministic test value so
      // the server starts cleanly under Playwright without a `.env` file.
      BETTER_AUTH_SECRET:
        process.env.BETTER_AUTH_SECRET ??
        "playwright-e2e-secret-not-for-production-use",
      BETTER_AUTH_URL: BASE_URL,
    },
  },
});
