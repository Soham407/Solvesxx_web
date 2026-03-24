const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const distDir = path.join(root, ".next");
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

function artifactReady(fileName) {
  const filePath = path.join(distDir, fileName);

  if (!fs.existsSync(filePath)) {
    return false;
  }

  const stat = fs.statSync(filePath);
  return stat.isFile() && stat.size >= 0;
}

async function main() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (requiredArtifacts.every(artifactReady)) {
      console.log(`Verified Next.js production artifacts in ${distDir}.`);
      return;
    }

    await sleep(1_000);
  }

  const missing = requiredArtifacts.filter((artifact) => !artifactReady(artifact));
  throw new Error(
    `Timed out waiting for Next.js build artifacts. Missing: ${missing.join(", ")}`
  );
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
