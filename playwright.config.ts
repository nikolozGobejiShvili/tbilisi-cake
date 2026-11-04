import { defineConfig } from "@playwright/test";

/**
 * Runs against the production build with the system Chrome, one test at a time, because this
 * laptop has little memory. Test orders go to data-test, never to the real data folder.
 */
const PORT = 3100;

export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  timeout: 180_000,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: "chrome",
    // The 3D cake only runs on a real graphics chip, so the tests must use it.
    launchOptions: { args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-webgl"] },
    trace: "off",
    screenshot: "only-on-failure",
  },
  webServer: {
    command: `npx next start -p ${PORT}`,
    port: PORT,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      ADMIN_PASSWORD: "e2e-only-password",
      ALLOW_HTTP_ADMIN: "1",
      DATA_DIR: "data-test",
      ORDER_RATE_LIMIT: "40",
      UPLOAD_RATE_LIMIT: "40",
      NEXT_TELEMETRY_DISABLED: "1",
    },
  },
});
