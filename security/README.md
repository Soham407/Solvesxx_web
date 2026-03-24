# Security Baseline

This folder contains a small Playwright-based security baseline that exercises the app's public and protected surfaces.

Run it with:

```bash
npx playwright test e2e/security-baseline.spec.ts
```

Or use the wrapper:

```bash
node scripts/run-security-baseline.cjs
```

The baseline covers:

- public IP utility behavior
- waitlist validation and duplicate handling
- anonymous redirect behavior on protected routes
