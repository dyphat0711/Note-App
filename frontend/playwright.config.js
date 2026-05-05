import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for Note-Flow E2E.
 *
 * Prerequisites before `npm run test:e2e`:
 *   1. Backend running:   cd backend && php artisan serve --port=8000
 *   2. Frontend running:  cd frontend && npm run dev   (Vite serves on 5173)
 *
 * The tests assume the backend has been freshly migrated:
 *   php artisan migrate:fresh
 *
 * To run a single suite:
 *   npx playwright test e2e/notes-core.spec.js
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  expect: {
    timeout: 10_000,
  },
  timeout: 30_000,
});
