# DEPRECATED — Do Not Deploy

This function is superseded by `check-guard-inactivity`, which uses the `detect_inactive_guards` SQL RPC and is the canonical inactivity detection path.

**Risk of keeping both active:** double-alerts for the same inactive guard.

## What to do

1. In the Supabase Dashboard → Edge Functions, delete the `inactivity-monitor` function.
2. Verify that any pg_cron schedule pointing to this function's URL has been removed.
3. Delete this folder from the repo once the above is confirmed.

The replacement: `supabase/functions/check-guard-inactivity/index.ts`
