// Shared: skip redundant Slack DMs for users who get push notifications.
// A user with any row in hub_push_subscriptions has the app installed with
// notifications on (dead subscriptions are pruned by send-push on 404/410),
// so the push IS their notification — the Slack DM would be a duplicate.
// Fails open (false) so a lookup error falls back to Slack, never silence.
export async function hasPush(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const res = await fetch(
      `${Deno.env.get('SUPABASE_URL')}/rest/v1/hub_push_subscriptions?select=id&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } },
    );
    if (!res.ok) return false;
    return ((await res.json()) as unknown[]).length > 0;
  } catch {
    return false;
  }
}
