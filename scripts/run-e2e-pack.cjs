const fs = require("node:fs");
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const packName = process.argv[2] || "smoke";
const passthrough = process.argv.slice(3);
const root = process.cwd();
const node = process.execPath;

// Fixed npm CLI resolution
function getNpmCliPath() {
  if (process.platform === "win32") {
    return path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
  }
  
  // Try multiple approaches
  const attempts = [
    // 1. Try require.resolve (original approach)
    () => {
      try {
        return require.resolve("npm/bin/npm-cli.js");
      } catch (e) {
        return null;
      }
    },
    // 2. Try local node_modules
    () => {
      const localPath = path.join(root, "node_modules", "npm", "bin", "npm-cli.js");
      if (fs.existsSync(localPath)) {
        return localPath;
      }
      return null;
    },
    // 3. Use which/npm command
    () => {
      try {
        const result = spawnSync("which", ["npm"], { encoding: "utf8" });
        if (result.status === 0 && result.stdout) {
          return result.stdout.trim();
        }
      } catch (e) {}
      return null;
    },
    // 4. Fallback to npm command directly
    () => "npm"
  ];

  for (const attempt of attempts) {
    const result = attempt();
    if (result && (!result.includes("npm-cli.js") || fs.existsSync(result))) {
      return result;
    }
  }
  
  return "npm";
}

const npmCli = getNpmCliPath();

function findUp(startDir, relativePath, maxLevels = 6) {
  let currentDir = startDir;
  for (let depth = 0; depth <= maxLevels; depth += 1) {
    const candidate = path.join(currentDir, relativePath);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(currentDir);
    if (parent === currentDir) {
      break;
    }
    currentDir = parent;
  }
  return null;
}

const nextBin =
  findUp(root, path.join("node_modules", "next", "dist", "bin", "next")) ||
  path.join(root, "node_modules", "next", "dist", "bin", "next");
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
};

const pack = packs[packName];

if (isListOnly) {
  const packList = Object.keys(packs).sort();
  console.log("Available test packs:");
  packList.forEach((p) => console.log(`  - ${p}`));
  process.exit(0);
}

if (!pack) {
  throw new Error(`Unknown test pack: ${packName}. Use --list to see available packs.`);
}

const config = {
  timeout: (process.env.PACK_TIMEOUT ? Number.parseInt(process.env.PACK_TIMEOUT, 10) : 600) * 1000,
  bail: process.env.PACK_CONTINUE_ON_FAILURE !== "1",
  manageServer: shouldManageLocalServer || process.env.PLAYWRIGHT_MANAGE_SERVER === "1",
};

const normalizeScriptName = (script) => script.replace(/^test:/, "");

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(host, port, timeout) {
  const endTime = Date.now() + timeout;

  while (Date.now() < endTime) {
    try {
      const http = await import("http");
      const req = http.get(`http://${host}:${port}/`, (res) => {
        if (res.statusCode === 200 || res.statusCode === 307) {
          return true;
        }
      });

      req.on("error", () => {});
      req.end();
      await sleep(100);
    } catch (e) {}

    await sleep(500);
  }

  throw new Error(`Server did not start within ${timeout}ms`);
}

async function main() {
  process.on("SIGINT", () => {
    console.log("\nCtrl+C received, cleaning up...");
    if (config.manageServer && fs.existsSync(pidPath)) {
      try {
        const pid = fs.readFileSync(pidPath, "utf8").trim();
        process.kill(-pid, "SIGTERM");
      } catch (e) {}
    }
    process.exit(130);
  });

  // Start server if needed
  if (config.manageServer) {
    if (fs.existsSync(pidPath)) {
      try {
        const existingPid = fs.readFileSync(pidPath, "utf8").trim();
        process.kill(-existingPid, "SIGTERM");
        await sleep(500);
      } catch (e) {}
    }

    console.log(`Starting Next.js server on ${appHost}:${appPort}...`);

    // Clean stale lock
    if (fs.existsSync(buildLockPath)) {
      try {
        fs.rmSync(buildLockPath, { recursive: true });
      } catch (e) {}
    }

    await new Promise((resolve, reject) => {
      const server = spawn(node, [nextBin, "start", "--hostname", appHost, "--port", appPort.toString()], {
        cwd: root,
        stdio: ["ignore", "inherit", "inherit"],
        detached: true,
      });

      fs.writeFileSync(pidPath, server.pid.toString());

      server.on("error", reject);
      server.on("exit", (code) => {
        if (code !== 0) {
          reject(new Error(`Server exited with code ${code}`));
        }
      });

      // Wait for server to be ready
      waitForServer(appHost, appPort, 180000).then(resolve).catch(reject);
    });
  }

  // Run tests
  let exitCode = 0;

  for (const entry of pack) {
    const env = { ...process.env, NEXT_PUBLIC_APP_URL: baseUrl, ...entry.env };
    const scriptName = normalizeScriptName(entry.script);

    console.log(`\n${"=".repeat(80)}`);
    console.log(`Running: ${scriptName}`);
    console.log(`${"=".repeat(80)}\n`);

    const startTime = Date.now();
    const result = spawnSync(npmCli.endsWith(".js") ? node : npmCli, [npmCli.endsWith(".js") ? npmCli : "run", entry.script, ...passthrough], {
      cwd: root,
      env,
      stdio: "inherit",
      timeout: config.timeout,
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (result.status !== 0) {
      console.error(`\n❌ Test failed: ${scriptName} (${duration}s)`);
      exitCode = result.status || 1;

      if (config.bail) {
        break;
      }
    } else {
      console.log(`\n✅ Test passed: ${scriptName} (${duration}s)`);
    }
  }

  // Cleanup
  if (config.manageServer && fs.existsSync(pidPath)) {
    try {
      const pid = fs.readFileSync(pidPath, "utf8").trim();
      process.kill(-pid, "SIGTERM");
      fs.unlinkSync(pidPath);
    } catch (e) {}
  }

  process.exit(exitCode);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
