import { test } from "@playwright/test";

import { scopedFeatureMatrix } from "./feature-matrix";
import { runWorkflowScenario } from "./helpers/workflows";

const workflowFeatures = scopedFeatureMatrix.filter(
  (feature) => feature.wave2Scenario && !feature.deferredReason
);

test.describe("Wave 2 Scoped Workflows", () => {
  test.describe.configure({ timeout: 300_000 });

  for (const feature of workflowFeatures) {
    test(`${feature.featureKey} workflow`, async ({ browser }, testInfo) => {
      await runWorkflowScenario(browser, feature, testInfo);
    });
  }
});
