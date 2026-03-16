---
paths:
  - "app/api/**/*.ts"
---

# API Route Conventions

When creating or editing API routes:

1. **File location** — `app/api/[route]/route.ts`
2. **Authentication** — Always validate the Supabase auth session using the server-side client.
3. **Error handling** — Return proper HTTP status codes with consistent error JSON: `{ error: string }`.
4. **Service role** — Use `SUPABASE_SERVICE_ROLE_KEY` only for server-side admin operations, never expose it.
5. **CORS** — For edge function-like endpoints, handle CORS headers properly.
6. **Validation** — Use Zod schemas for request body validation.
