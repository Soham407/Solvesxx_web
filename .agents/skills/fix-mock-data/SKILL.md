---
name: fix-mock-data
description: Use when replacing hardcoded or mocked data with real database calls.
---
# Fix Mock Data Guide

1. Check `.ai_context/PHASES.md` to identify which parts of the application have known mock data.
2. Review `.ai_context/CONTEXT.md` for the existing hooks you should use to wire real data.
3. Replace hardcoded UUIDs with real `service_code` lookups.
