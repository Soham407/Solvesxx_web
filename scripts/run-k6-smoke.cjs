const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const summaryPath = path.join(process.cwd(), "test-results", "k6-summary.json");
fs.mkdirSync(path.dirname(summaryPath), { recursive: true });

const result = spawnSync(
  process.platform === "win32" ? "k6.exe" : "k6",
  ["run", "--summary-export", summaryPath, "performance/k6-smoke.js"],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  }
);

process.exit(result.status ?? 1);
