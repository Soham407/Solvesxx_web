const fs = require("node:fs");
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const packName = process.argv[2] || "smoke";
const passthrough = process.argv.slice(3);
const root = process.cwd();
const node = process.execPath;
const npmCli =
  process.platform === "win32"
    ? path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")
    : require.resolve("npm/bin/npm-cli.js");
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const pidPath = path.join(root, ".test-app.pid");
const logPath = path.join(root, ".test-app.log");
const buildLockPath = path.join(root, ".next", "lock");

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://127.0.0.1:3000";
const parsedBaseUrl = new URL(baseUrl);
const appHost = parsedBaseUrl.hostname;
const appPort =
  parsedBaseUrl.port ||
  (parsedBaseUrl.protocol === "https:" ? "443" : "80");
const shouldManageLocalServer = /^(127\.0\.0\.1|localhost)$/i.test(appHost);
const isListOnly = passthrough.includes("--list");

const packs = {
  smoke: [
    { script: "test:e2e:smoke:foundation:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
    { script: "test:e2e:roles:platform:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
    { script: "test:e2e:roles:management:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
    { script: "test:e2e:roles:portals:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
    { script: "test:e2e:roles:field:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
    { script: "test:e2e:workflow:procurement:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1" } },
    { script: "test:e2e:workflow:buyer:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1" } },
    { script: "test:e2e:workflow:guard:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1" } },
  ],
  foundation: [
    { script: "test:e2e:smoke:foundation:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
  ],
  platform: [
    { script: "test:e2e:roles:platform:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
  ],
  management: [
    { script: "test:e2e:roles:management:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
  ],
  portals: [
    { script: "test:e2e:roles:portals:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
  ],
  field: [
    { script: "test:e2e:roles:field:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
  ],
  roles: [
    { script: "test:e2e:roles:platform:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
    { script: "test:e2e:roles:management:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
    { script: "test:e2e:roles:portals:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
    { script: "test:e2e:roles:field:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1", PLAYWRIGHT_SKIP_FEATURE_FIXTURES: "1" } },
  ],
  procurement: [
    { script: "test:e2e:workflow:procurement:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1" } },
  ],
  buyer: [
    { script: "test:e2e:workflow:buyer:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1" } },
  ],
  guard: [
    { script: "test:e2e:workflow:guard:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1" } },
  ],
  wave1: [
    { script: "test:e2e:features:wave1:existing" },
  ],
  wave2: [
    { script: "test:e2e:features:wave2:existing" },
  ],
  features: [
    { script: "test:e2e:features:wave1:existing" },
    { script: "test:e2e:features:wave2:existing", env: { PLAYWRIGHT_RESET_COVERAGE: "0" } },
  ],
  full: [
    { script: "test:e2e:full:existing" },
  ],
  "full-visual": [
    { script: "test:e2e:full:visual:existing" },
  ],
  security: [
    { script: "test:security:existing", env: { PLAYWRIGHT_FAIL_ON_FLAKY: "1" } },
  ],
};

function run(command, args, env = process.env) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    env,
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} exited with code ${result.status}`);
  }
}

function runNpmScript(script, extraEnv = {}, includePassthrough = true) {
  const args = [npmCli, "run", script];

  if (includePassthrough && passthrough.length > 0) {
    args.push("--", ...passthrough);
  }

  run(node, args, {
    ...process.env,
    ...extraEnv,
    NEXT_PUBLIC_APP_URL: baseUrl,
  });
}

function runNodeScript(scriptFile) {
  run(node, [path.join(root, "scripts", scriptFile)]);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readPid() {
  if (!fs.existsSync(pidPath)) {
    return null;
  }

  const value = Number.parseInt(fs.readFileSync(pidPath, "utf8").trim(), 10);
  return Number.isFinite(value) ? value : null;
}

function isProcessRunning(pid) {
  if (!pid) {
    return false;
  }

  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function stopPid(pid) {
  if (!pid || !isProcessRunning(pid)) {
    return;
  }

  if (process.platform === "win32") {
    spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
      stdio: "ignore",
    });
    return;
  }

  process.kill(pid);
}

async function isAppReady() {
  try {
    const response = await fetch(`${baseUrl}/login`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });

    return response.ok || response.status === 307 || response.status === 308;
  } catch {
    return false;
  }
}

async function waitForAppReady(child) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await isAppReady()) {
      return;
    }

    if (child.exitCode !== null || child.killed) {
      throw new Error("The managed test app exited before it became ready.");
    }

    await sleep(2_000);
  }

  throw new Error(`Timed out waiting for the test app at ${baseUrl}.`);
}

function stopTrackedApp() {
  const trackedPid = readPid();
  stopPid(trackedPid);
  fs.rmSync(pidPath, { force: true });
}

function clearBuildLock() {
  fs.rmSync(buildLockPath, { force: true });
}

async function startManagedApp() {
  stopTrackedApp();
  fs.rmSync(logPath, { force: true });

  const logFd = fs.openSync(logPath, "a");
  const child = spawn(node, [nextBin, "start", "--hostname", appHost], {
    cwd: root,
    stdio: ["ignore", logFd, logFd],
    env: {
      ...process.env,
      PORT: appPort,
    },
    windowsHide: true,
  });

  fs.closeSync(logFd);
  fs.writeFileSync(pidPath, String(child.pid));

  try {
    await waitForAppReady(child);
    return child;
  } catch (error) {
    stopPid(child.pid);
    fs.rmSync(pidPath, { force: true });
    throw error;
  }
}

async function main() {
  const commands = packs[packName];
  let managedApp = null;
  const failures = [];

  if (!commands) {
    throw new Error(`Unknown E2E pack "${packName}".`);
  }

  if (!isListOnly) {
    stopTrackedApp();
    clearBuildLock();
    runNpmScript("build", {}, false);
    runNodeScript("wait-for-next-build.cjs");

    if (shouldManageLocalServer) {
      managedApp = await startManagedApp();
    }
  }

  try {
    for (const command of commands) {
      try {
        runNpmScript(command.script, command.env);
      } catch (error) {
        failures.push({
          script: command.script,
          message: error instanceof Error ? error.message : String(error),
        });

        if (packName !== "features") {
          throw error;
        }
      }
    }
  } finally {
    if (!isListOnly) {
      try {
        if (managedApp) {
          stopPid(managedApp.pid);
          fs.rmSync(pidPath, { force: true });
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
      }
    }
  }

  if (failures.length > 0) {
    const summary = failures
      .map((failure) => `${failure.script}: ${failure.message}`)
      .join("\n");
    throw new Error(`One or more suite commands failed.\n${summary}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
