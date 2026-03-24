const fs = require("node:fs");
const path = require("node:path");
const { spawn, spawnSync } = require("node:child_process");

const root = process.cwd();
const pidPath = path.join(root, ".test-app.pid");
const logPath = path.join(root, ".test-app.log");
const host = process.env.TEST_APP_HOST || "127.0.0.1";
const port = process.env.TEST_APP_PORT || "3000";
const baseURL = `http://${host}:${port}`;
const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
const powershell =
  process.platform === "win32"
    ? path.join(
        process.env.SystemRoot || "C:\\Windows",
        "System32",
        "WindowsPowerShell",
        "v1.0",
        "powershell.exe",
      )
    : null;
const requiredArtifacts = [
  "BUILD_ID",
  "build-manifest.json",
  "prerender-manifest.json",
  "routes-manifest.json",
  "required-server-files.json",
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function quotePs(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
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

async function isAppReady() {
  try {
    const response = await fetch(`${baseURL}/login`, {
      redirect: "manual",
      signal: AbortSignal.timeout(5_000),
    });

    return response.ok || response.status === 307 || response.status === 308;
  } catch {
    return false;
  }
}

function buildArtifactsReady() {
  return requiredArtifacts.every((artifact) =>
    fs.existsSync(path.join(root, ".next", artifact))
  );
}

async function waitForBuildArtifacts() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (buildArtifactsReady()) {
      return;
    }

    await sleep(1_000);
  }

  const missing = requiredArtifacts.filter(
    (artifact) => !fs.existsSync(path.join(root, ".next", artifact))
  );
  throw new Error(
    `Timed out waiting for Next.js build artifacts before start. Missing: ${missing.join(", ")}`
  );
}

async function waitForReady(pid) {
  for (let attempt = 0; attempt < 90; attempt += 1) {
    if (await isAppReady()) {
      return;
    }

    if (!isProcessRunning(pid)) {
      throw new Error("The test app exited before it became ready.");
    }

    await sleep(2_000);
  }

  throw new Error(`Timed out waiting for the test app at ${baseURL}.`);
}

async function main() {
  await waitForBuildArtifacts();

  const existingPid = readPid();

  if (existingPid && isProcessRunning(existingPid) && await isAppReady()) {
    console.log(`Test app already running at ${baseURL} (pid ${existingPid}).`);
    return;
  }

  if (existingPid && isProcessRunning(existingPid)) {
    try {
      if (process.platform === "win32") {
        spawnSync("taskkill", ["/PID", String(existingPid), "/T", "/F"], {
          stdio: "ignore",
        });
      } else {
        process.kill(existingPid);
      }
    } catch {}

    await sleep(1_000);
  }

  fs.rmSync(pidPath, { force: true });
  fs.rmSync(logPath, { force: true });
  let childPid;

  if (process.platform === "win32") {
    const startCommand = [
      `$env:PORT = ${quotePs(port)}`,
      `$process = Start-Process -FilePath ${quotePs(process.execPath)} -ArgumentList ${quotePs(nextBin)}, ${quotePs("start")}, ${quotePs("--hostname")}, ${quotePs(host)} -WorkingDirectory ${quotePs(root)} -RedirectStandardOutput ${quotePs(logPath)} -RedirectStandardError ${quotePs(logPath)} -PassThru`,
      "Write-Output $process.Id",
    ].join("; ");

    const result = spawnSync(powershell, ["-NoProfile", "-Command", startCommand], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: process.env,
    });

    if (result.error) {
      throw result.error;
    }

    if (result.status !== 0) {
      throw new Error(result.stderr?.trim() || "Failed to start the test app.");
    }

    childPid = Number.parseInt(result.stdout.trim(), 10);
  } else {
    const logFd = fs.openSync(logPath, "a");
    const child = spawn(
      process.execPath,
      [nextBin, "start", "--hostname", host],
      {
        cwd: root,
        detached: true,
        stdio: ["ignore", logFd, logFd],
        env: {
          ...process.env,
          PORT: port,
        },
      },
    );

    fs.closeSync(logFd);
    child.unref();
    childPid = child.pid;
  }

  if (!Number.isFinite(childPid)) {
    throw new Error("Failed to capture the test app process id.");
  }

  fs.writeFileSync(pidPath, String(childPid));

  try {
    await waitForReady(childPid);
    console.log(`Started test app at ${baseURL} (pid ${childPid}).`);
  } catch (error) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/PID", String(childPid), "/T", "/F"], {
          stdio: "ignore",
          detached: true,
        }).unref();
      } else {
        process.kill(childPid);
      }
    } catch {}

    fs.rmSync(pidPath, { force: true });
    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
