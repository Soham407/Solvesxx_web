import fs from "node:fs";
import path from "node:path";

import {
  scopedFeatureMatrix,
  type ScopedFeatureTestConfig,
} from "./feature-matrix";
import { getCoverageDir, readCoverageRecords } from "./helpers/coverage";

type CoverageMatrixRow = {
  scopeItem: string;
  featureKey: string;
  status: string;
  testIds: string[];
  evidence: string[];
  failureType: string | null;
  deferredReason: string | null;
};

function buildRow(
  feature: ScopedFeatureTestConfig,
  records: ReturnType<typeof readCoverageRecords>
): CoverageMatrixRow {
  if (feature.deferredReason) {
    return {
      scopeItem: `${feature.scopeSection} ${feature.title}`,
      featureKey: feature.featureKey,
      status: "deferred",
      testIds: [],
      evidence: feature.deferredReason ? [feature.deferredReason] : [],
      failureType: null,
      deferredReason: feature.deferredReason,
    };
  }

  const matching = records.filter((record) => record.featureKey === feature.featureKey);

  if (matching.length === 0) {
    return {
      scopeItem: `${feature.scopeSection} ${feature.title}`,
      featureKey: feature.featureKey,
      status: "not_run",
      testIds: [],
      evidence: [],
      failureType: null,
      deferredReason: null,
    };
  }

  const failed = matching.find((record) => record.status === "failed");
  const passed = matching.find((record) => record.status === "passed");
  const deferred = matching.find((record) => record.status === "deferred");

  return {
    scopeItem: `${feature.scopeSection} ${feature.title}`,
    featureKey: feature.featureKey,
    status: failed ? "failed" : passed ? "passed" : deferred ? "deferred" : "not_run",
    testIds: matching.map((record) => record.testId),
    evidence: matching.flatMap((record) => record.evidence),
    failureType: failed?.failureType ?? null,
    deferredReason: deferred?.deferredReason ?? deferred?.details ?? null,
  };
}

async function globalTeardown() {
  const coverageRecords = readCoverageRecords();
  const rows = scopedFeatureMatrix.map((feature) => buildRow(feature, coverageRecords));
  const outputDir = path.join(process.cwd(), "test-results");

  fs.mkdirSync(outputDir, { recursive: true });

  fs.writeFileSync(
    path.join(outputDir, "scope-coverage-matrix.json"),
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        coverageDirectory: getCoverageDir(),
        rows,
      },
      null,
      2
    )
  );

  const markdown = [
    "# Scope Coverage Matrix",
    "",
    "| Scope Item | Feature Key | Status | Test IDs | Evidence | Failure Type | Deferred Reason |",
    "|---|---|---|---|---|---|---|",
    ...rows.map((row) =>
      `| ${row.scopeItem} | ${row.featureKey} | ${row.status} | ${row.testIds.join("<br/>")} | ${row.evidence.join("<br/>")} | ${row.failureType ?? ""} | ${row.deferredReason ?? ""} |`
    ),
    "",
  ].join("\n");

  fs.writeFileSync(path.join(outputDir, "scope-coverage-matrix.md"), markdown);
}

export default globalTeardown;
