import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  webServer: { command: "env NEXT_PUBLIC_DATA_MODE=browser npm run dev -- --port 3107", url: "http://127.0.0.1:3107", reuseExistingServer: false },
  use: { baseURL: "http://127.0.0.1:3107", trace: "on-first-retry" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
});
