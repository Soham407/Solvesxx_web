import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

/**
 * Standardized read hook factory for Supabase queries.
 * Use this for all new hooks going forward — do NOT rewrite existing hooks.
 *
 * @example
 * function useMyData() {
 *   return useSupabaseQuery(() =>
 *     supabase.from("my_table").select("*").then(({ data, error }) => {
 *       if (error) throw error;
 *       return data ?? [];
 *     })
 *   );
 * }
 */
export function useSupabaseQuery<T>(
  queryFn: () => Promise<T[]>,
  deps: any[] = []
): { data: T[]; isLoading: boolean; error: string | null; refresh: () => void } {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await queryFn();
      setData(result);
    } catch (err: any) {
      const message = err?.message ?? "Failed to load data";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { data, isLoading, error, refresh: fetch };
}
