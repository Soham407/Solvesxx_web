import { test } from "@playwright/test";

import { getFeaturesForModule } from "./feature-matrix";
import { runScopedFeatureSmoke } from "./helpers/features";

const features = getFeaturesForModule("hrms_service").filter((feature) => !feature.deferredReason);

test.describe("Wave 1 HRMS + Service Jobs + Field Ops", () => {
  for (const feature of features) {
    test(`${feature.featureKey} smoke`, async ({ page }, testInfo) => {
      await runScopedFeatureSmoke(page, feature, testInfo);
    });
  }
});
