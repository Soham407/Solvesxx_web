import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("Release gate issue #23: e2e smoke runner contract", () => {
  it("ensures waitForServer resolves readiness from HTTP status checks", async () => {
    const source = await readRepoFile("scripts/run-e2e-pack.cjs");

    expect(
      sourceContainsAll(source, [
        "const isReady = await new Promise((resolve)",
        "resolve(res.statusCode === 200 || res.statusCode === 307);",
        "if (isReady) {",
        "req.setTimeout(5000",
      ])
    ).toBe(true);
  });
});
