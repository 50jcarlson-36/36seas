import type { SupabaseClient } from "@supabase/supabase-js";

export async function getStripeCustomerId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", userId)
    .maybeSingle();

  if (typeof profile?.stripe_customer_id === "string" && profile.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Backward-compatible fallback for customers created before the profile column existed.
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", userId)
    .not("stripe_customer_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return typeof subscription?.stripe_customer_id === "string"
    ? subscription.stripe_customer_id
    : null;
}

export function getIdempotencyKey(request: Request): string | undefined {
  const value = request.headers.get("idempotency-key")?.trim();
  return value && value.length <= 255 ? value : undefined;
}
