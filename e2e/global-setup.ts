import { execFileSync } from "node:child_process";
import path from "node:path";

import { resetCoverageArtifacts } from "./helpers/coverage";

async function globalSetup() {
  if (process.env.PLAYWRIGHT_RESET_COVERAGE !== "0") {
    resetCoverageArtifacts();
  }

  const scripts = [path.join(process.cwd(), "scripts", "provision-role-test-users.cjs")];

  if (process.env.PLAYWRIGHT_SKIP_FEATURE_FIXTURES !== "1") {
    scripts.push(path.join(process.cwd(), "scripts", "provision-feature-fixtures.cjs"));
  }

  for (const scriptPath of scripts) {
    execFileSync(process.execPath, [scriptPath], {
      cwd: process.cwd(),
      stdio: "inherit",
      env: process.env,
    });
  }
}

export default globalSetup;
