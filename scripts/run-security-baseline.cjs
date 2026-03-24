const { spawnSync } = require("node:child_process");

const result = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["playwright", "test", "e2e/security-baseline.spec.ts"],
  {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  }
);

process.exit(result.status ?? 1);
