---
name: new-hook
description: Use when creating a new database hook (e.g., custom React hooks for fetching data). Loads context to prevent duplicates and ensure conventions.
argument-hint: "[EntityName]"
---

# New Hook Guide

## Step 0: Verify No Duplicate (MANDATORY)

1. Read `.ai_context/CONTEXT.md` — Search the hooks list for any hook that already handles this entity.
2. Search the `hooks/` directory: `ls hooks/ | grep -i $ARGUMENTS`
3. If a hook exists, **STOP** and tell the user. Extend it instead of creating a new one.

## Step 1: Understand the Data Shape

- Read `.ai_context/SCOPE.md` section 14 for the DB schema of the target table.
- Check `supabase-types.ts` for the auto-generated table type.

## Step 2: Create the Hook

Create `hooks/use$ARGUMENTS.ts`:

```typescript
"use client";
import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@supabase/ssr";

export function use$ARGUMENTS() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("table_name")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) setError(error.message);
    else setData(data || []);
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Add Realtime if needed:
  // useEffect(() => {
  //   const channel = supabase.channel('channel-name')
  //     .on('postgres_changes', { event: '*', schema: 'public', table: 'table_name' }, fetchData)
  //     .subscribe();
  //   return () => { supabase.removeChannel(channel); };
  // }, []);

  const createFn = async (payload: any) => { /* ... */ };
  const updateFn = async (id: string, payload: any) => { /* ... */ };
  const deleteFn = async (id: string) => { /* ... */ };

  return { data, isLoading, error, createFn, updateFn, deleteFn, refresh: fetchData };
}
```

## Step 3: Update Context

- [ ] Add the new hook to `.ai_context/CONTEXT.md` hooks list
