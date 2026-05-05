export interface PushTokenRegistrationInput {
  userId: string;
  token: string;
  deviceType: string;
}

type PushTokenClient = {
  from(table: "push_tokens"): any;
};

export async function registerPushToken(
  supabase: PushTokenClient,
  input: PushTokenRegistrationInput,
  now: Date = new Date()
) {
  const { error } = await supabase.from("push_tokens").upsert(
    {
      user_id: input.userId,
      token: input.token,
      token_type: "fcm",
      device_type: input.deviceType,
      last_used: now.toISOString(),
      is_active: true,
    },
    {
      onConflict: "user_id,token",
    }
  );

  if (error) {
    throw error;
  }
}

export async function deactivatePushToken(
  supabase: PushTokenClient,
  input: PushTokenRegistrationInput
) {
  const { error } = await supabase
    .from("push_tokens")
    .update({ is_active: false })
    .eq("user_id", input.userId)
    .eq("token", input.token);

  if (error) {
    throw error;
  }
}
