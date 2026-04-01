import { defineConfig, devices } from "@playwright/test";

const suiteMode = process.env.E2E_SUITE ?? (process.env.CI ? "smoke" : "full");
const visualEnabled = process.env.E2E_VISUAL === "1";
const baseURL = process.env.NEXT_PUBLIC_APP_URL ?? "http://127.0.0.1:3000";
const htmlReportOutputFolder = process.env.PLAYWRIGHT_HTML_OUTPUT_DIR;
const shouldManageLocalServer = /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/i.test(baseURL);
const manageServer = process.env.PLAYWRIGHT_MANAGE_SERVER === "1" && shouldManageLocalServer;

const smokeTestMatch = [
  "**/roles-*.spec.ts",
  "**/auth-rbac-edge-cases.spec.ts",
  "**/auth-certification.spec.ts",
  "**/api-authz.spec.ts",
  "**/security-baseline.spec.ts",
  "**/admin-procurement.spec.ts",
  "**/buyer-order-flow.spec.ts",
  "**/guard-routine.spec.ts",
];

const fullTestIgnore = visualEnabled ? [] : ["**/visual-regression.spec.ts"];

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results/playwright",
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 60_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  failOnFlakyTests: process.env.PLAYWRIGHT_FAIL_ON_FLAKY === "1",
  retries: process.env.CI ? 2 : 0,
  workers: suiteMode === "smoke" ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never", outputFolder: htmlReportOutputFolder }]],
  use: {
    baseURL,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  webServer: manageServer
    ? {
        command: "npm run start -- --hostname 127.0.0.1",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 180_000,
      }
    : undefined,
  projects:
    suiteMode === "smoke"
      ? [
          {
            name: "smoke-chromium",
            use: { ...devices["Desktop Chrome"] },
            testMatch: smokeTestMatch,
          },
        ]
      : [
          {
            name: "chromium",
            use: { ...devices["Desktop Chrome"] },
            testMatch: ["**/*.spec.ts"],
            testIgnore: fullTestIgnore,
          },
          {
            name: "firefox",
            use: { ...devices["Desktop Firefox"] },
            testMatch: ["**/*.spec.ts"],
            testIgnore: fullTestIgnore,
          },
          {
            name: "webkit",
            use: { ...devices["Desktop Safari"] },
            testMatch: ["**/*.spec.ts"],
            testIgnore: fullTestIgnore,
          },
          {
            name: "mobile-chrome",
            use: { ...devices["Pixel 5"] },
            testMatch: ["**/*.spec.ts"],
            testIgnore: fullTestIgnore,
          },
        ],
});
