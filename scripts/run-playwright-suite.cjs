const path = require("node:path");
const { spawnSync } = require("node:child_process");

const args = process.argv.slice(2);
const suite = args[0] || "full";
const passthrough = [];
let visual = false;
let manageServer = false;
let failOnFlaky = false;
let reuseCoverage = false;

for (const arg of args.slice(1)) {
  if (arg === "--visual") {
    visual = true;
    continue;
  }

  if (arg === "--manage-server") {
    manageServer = true;
    continue;
  }

  if (arg === "--fail-on-flaky") {
    failOnFlaky = true;
    continue;
  }

  if (arg === "--reuse-coverage") {
    reuseCoverage = true;
    continue;
  }

  passthrough.push(arg);
}

const command = process.execPath;
const cliPath = path.join(process.cwd(), "node_modules", "playwright", "cli.js");
const reportSlug = [suite, visual ? "visual" : null, ...passthrough]
  .filter(Boolean)
  .join("-")
  .replace(/[^a-z0-9_-]+/gi, "-")
  .replace(/-+/g, "-")
  .replace(/^-|-$/g, "")
  .toLowerCase();
const env = {
  ...process.env,
  E2E_SUITE: suite,
  PLAYWRIGHT_HTML_OUTPUT_DIR: path.join(
    process.cwd(),
    "playwright-report",
    `${reportSlug || "suite"}-${Date.now()}`,
  ),
};

if (visual) {
  env.E2E_VISUAL = "1";
}

if (manageServer) {
  env.PLAYWRIGHT_MANAGE_SERVER = "1";
}

if (failOnFlaky) {
  env.PLAYWRIGHT_FAIL_ON_FLAKY = "1";
}

if (reuseCoverage) {
  env.PLAYWRIGHT_RESET_COVERAGE = "0";
}

const result = spawnSync(command, [cliPath, "test", ...passthrough], {
  cwd: process.cwd(),
  stdio: "inherit",
  env,
});

if (result.error) {
  console.error(result.error);
}

process.exit(result.status ?? 1);
