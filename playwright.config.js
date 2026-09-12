import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  reporter: "list",
  use: {
    baseURL: process.env.TIMER_TEST_URL || "http://127.0.0.1:8765",
    timezoneId: "Asia/Tokyo",
    browserName: "chromium",
    launchOptions: process.env.TIMER_CHROME_PATH
      ? { executablePath: process.env.TIMER_CHROME_PATH }
      : {},
  },
  webServer: process.env.TIMER_TEST_URL
    ? undefined
    : {
        command: "python3 -m http.server 8765 --bind 127.0.0.1",
        url: "http://127.0.0.1:8765",
        reuseExistingServer: !process.env.CI,
      },
});
