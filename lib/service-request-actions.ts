import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Validates if a service request can be closed by checking for buyer feedback.
 * @param id The service request ID
 * @param supabase The Supabase client
 * @returns An object indicating success or failure with an optional error message.
 */
export async function validateFeedbackBeforeClose(
  id: string,
  supabase: SupabaseClient | any
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Check if buyer feedback exists
    const { data: feedback, error: feedbackError } = await supabase
      .from("buyer_feedback")
      .select("id")
      .eq("service_request_id", id)
      .maybeSingle();

    if (feedbackError) throw feedbackError;

    if (!feedback) {
      return {
        success: false,
        error: "Buyer feedback is required before closing this request. Please submit feedback first.",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to validate feedback";
    return { success: false, error: errorMessage };
  }
}

/**
 * Closes a service request after validating requirements.
 * @param id The service request ID
 * @param supabase The Supabase client
 * @returns An object indicating success or failure with an optional error message.
 */
export async function closeServiceRequestAction(
  id: string,
  supabase: SupabaseClient | any
): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Validate feedback gate
    const validation = await validateFeedbackBeforeClose(id, supabase);
    if (!validation.success) {
      return validation;
    }

    // 2. Update status to 'closed'
    const { error: updateError } = await supabase
      .from("service_requests")
      .update({ status: "closed" })
      .eq("id", id);

    if (updateError) throw updateError;

    return { success: true };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Failed to close request";
    return { success: false, error: errorMessage };
  }
}
