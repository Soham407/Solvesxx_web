import { useState } from "react";
import { toast } from "sonner";

interface MutationOptions {
  successMessage?: string;
  errorMessage?: string;
}

interface MutationResult<TResult> {
  success: boolean;
  data?: TResult;
  error?: string;
}

/**
 * Standardized mutation factory for Supabase writes.
 * Use this for all new hooks going forward — do NOT rewrite existing hooks.
 *
 * @example
 * function useMyData() {
 *   const { execute: createItem, isLoading } = useSupabaseMutation(
 *     async (payload: NewItem) => {
 *       const { data, error } = await supabase.from("my_table").insert(payload).select().single();
 *       if (error) throw error;
 *       return data;
 *     },
 *     { successMessage: "Item created" }
 *   );
 *   return { createItem, isLoading };
 * }
 */
export function useSupabaseMutation<TArgs, TResult>(
  mutationFn: (args: TArgs) => Promise<TResult>,
  options: MutationOptions = {}
): { execute: (args: TArgs) => Promise<MutationResult<TResult>>; isLoading: boolean } {
  const [isLoading, setIsLoading] = useState(false);

  const execute = async (args: TArgs): Promise<MutationResult<TResult>> => {
    setIsLoading(true);
    try {
      const data = await mutationFn(args);
      if (options.successMessage) {
        toast.success(options.successMessage);
      }
      return { success: true, data };
    } catch (err: any) {
      const message = err?.message ?? options.errorMessage ?? "Operation failed";
      toast.error(message);
      return { success: false, error: message };
    } finally {
      setIsLoading(false);
    }
  };

  return { execute, isLoading };
}
