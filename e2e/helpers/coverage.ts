import fs from "node:fs";
import path from "node:path";

export type CoverageFailureType = "product_bug" | "fixture_bug" | "harness_bug";
export type CoverageStatus =
  | "passed"
  | "failed"
  | "deferred"
  | "not_run";

export type ScopeCoverageRecord = {
  featureKey: string;
  scopeItem: string;
  testId: string;
  status: CoverageStatus;
  evidence: string[];
  failureType?: CoverageFailureType;
  details?: string;
  deferredReason?: string;
};

const COVERAGE_DIR = path.join(process.cwd(), "test-results", "scope-coverage");

function ensureCoverageDir() {
  fs.mkdirSync(COVERAGE_DIR, { recursive: true });
}

function sanitize(value: string) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").toLowerCase();
}

export function getCoverageDir() {
  return COVERAGE_DIR;
}

export function resetCoverageArtifacts() {
  fs.rmSync(COVERAGE_DIR, { force: true, recursive: true });
  ensureCoverageDir();
}

export function writeCoverageRecord(record: ScopeCoverageRecord) {
  ensureCoverageDir();

  const filePath = path.join(
    COVERAGE_DIR,
    `${sanitize(record.featureKey)}__${sanitize(record.testId)}.json`
  );

  fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
}

export function readCoverageRecords() {
  if (!fs.existsSync(COVERAGE_DIR)) {
    return [] as ScopeCoverageRecord[];
  }

  return fs
    .readdirSync(COVERAGE_DIR)
    .filter((fileName) => fileName.endsWith(".json"))
    .map((fileName) =>
      JSON.parse(
        fs.readFileSync(path.join(COVERAGE_DIR, fileName), "utf8")
      ) as ScopeCoverageRecord
    );
}
