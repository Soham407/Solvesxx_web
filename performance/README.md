# Performance Smoke

This folder contains the standalone `k6` smoke script used for lightweight load verification in a dedicated test environment.

Run it with:

```bash
k6 run performance/k6-smoke.js
```

Or use the wrapper:

```bash
node scripts/run-k6-smoke.cjs
```

Optional environment variables:

- `K6_BASE_URL` or `NEXT_PUBLIC_APP_URL`
- `K6_VUS`
- `K6_DURATION`

The script hits the public login page, the client IP utility route, and the public waitlist endpoint with a unique email per iteration.
