import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3004";
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER !== "0";

export default defineConfig({
  testDir: "./tests/playwright",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    launchOptions: {
      args: [
        "--disable-crash-reporter",
        "--disable-crashpad",
        "--disable-breakpad"
      ],
      env: {
        HOME: "/tmp",
        TMPDIR: "/tmp",
        XDG_CONFIG_HOME: "/tmp",
        XDG_CACHE_HOME: "/tmp"
      }
    }
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        channel: "chromium"
      }
    }
  ],
  webServer: {
    command: "WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=1 pnpm --filter @queuekeeper/web dev -- --hostname 127.0.0.1 --port 3004",
    url: baseURL,
    reuseExistingServer,
    timeout: 120_000
  }
});
