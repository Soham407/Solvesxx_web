const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const pidPath = path.join(process.cwd(), ".test-app.pid");

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

function main() {
  const pid = readPid();

  if (!pid) {
    console.log("No tracked test app is running.");
    return;
  }

  if (isProcessRunning(pid)) {
    try {
      if (process.platform === "win32") {
        const result = spawnSync("taskkill", ["/PID", String(pid), "/T", "/F"], {
          stdio: "ignore",
        });

        if (result.status !== 0) {
          throw new Error(`taskkill exited with code ${result.status}`);
        }
      } else {
        process.kill(pid);
      }

      console.log(`Stopped test app pid ${pid}.`);
    } catch (error) {
      console.error(`Failed to stop test app pid ${pid}: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  } else {
    console.log(`Tracked test app pid ${pid} is already gone.`);
  }

  fs.rmSync(pidPath, { force: true });
}

main();
