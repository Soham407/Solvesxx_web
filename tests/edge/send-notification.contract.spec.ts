import { describe, expect, it } from "vitest";

import { readRepoFile, sourceContainsAll } from "../helpers/source-files";

describe("Edge contract: send-notification", () => {
  it("keeps the authentication and authorization guardrails intact", async () => {
    const source = await readRepoFile("supabase/functions/send-notification/index.ts");

    expect(
      sourceContainsAll(source, [
        "Validate the caller is authenticated via a valid Supabase JWT.",
        "Never compare the service role key as a Bearer token",
        "Unauthorized",
        "Missing required fields: user_id (or mobile), title, body",
        "Invalid mobile number format",
        "MSG91 Config Missing",
        "notification_logs",
      ])
    ).toBe(true);
  });

  it("keeps push-token cleanup and SMS fallback behavior intact", async () => {
    const source = await readRepoFile("supabase/functions/send-notification/index.ts");

    expect(
      sourceContainsAll(source, [
        "messaging/registration-token-not-registered",
        "update({ is_active: false })",
        "channel === 'sms' || channel === 'both'",
        "channel: 'fcm'",
        "channel: 'sms'",
      ])
    ).toBe(true);
  });
});
