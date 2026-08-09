import { PLAN_LIMITS, asPlanKey, monthWindowStart, type PlanKey } from "./plans";
import type { SupabaseClient } from "@supabase/supabase-js";

export type CreditType = "review" | "cover" | "format" | "submission" | "story" | "originality" | "audio";

export type CreditSpendResult = {
  ok: boolean;
  usageId?: string;
  plan?: PlanKey;
  type?: CreditType;
  source?: "included" | "purchased";
  remaining?: number;
  includedRemaining?: number;
  extraRemaining?: number;
  limit?: number;
  code?: string;
  error?: string;
};

export type CreditBalance = {
  plan: PlanKey;
  limits: Record<CreditType, number>;
  used: Record<CreditType, number>;
  remaining: Record<CreditType, number>;
  extraRemaining: number;
};

export const CREDIT_TYPES: CreditType[] = ["story", "review", "cover", "format", "submission", "originality", "audio"];

export async function checkAndConsumeCredits(
  supabase: SupabaseClient,
  _userId: string,
  type: CreditType,
  amount: number,
  relatedId?: string
): Promise<CreditSpendResult> {
  const { data, error } = await supabase.rpc("consume_credits", {
    p_type: type,
    p_amount: amount,
    p_related_id: relatedId ?? null,
  });
  if (error) return { ok: false, code: "CREDIT_SERVICE_UNAVAILABLE", error: "Credits could not be checked. Please try again before starting this generation." };
  const result = (data || {}) as CreditSpendResult;
  return result.ok ? result : { ...result, ok: false, error: result.error || "No credits remain for this action. Upgrade your plan or add extra credits in Plan & billing." };
}

export async function checkAndConsumeCredit(
  supabase: SupabaseClient,
  _userId: string,
  type: CreditType,
  relatedId?: string
): Promise<CreditSpendResult> {
  // This atomic RPC is the point of charge. Callers intentionally do not reverse
  // the ledger entry when later provider or production work fails.
  const { data, error } = await supabase.rpc("consume_credit", {
    p_type: type,
    p_related_id: relatedId ?? null,
  });

  if (error) {
    return {
      ok: false,
      code: "CREDIT_SERVICE_UNAVAILABLE",
      error: "Credits could not be checked. Please try again before starting this generation.",
    };
  }

  const result = (data || {}) as CreditSpendResult;
  return result.ok
    ? result
    : {
        ...result,
        ok: false,
        error:
          result.error ||
          "No credits remain for this action. Upgrade your plan or add extra credits in Plan & billing.",
      };
}

export async function getCreditBalance(
  supabase: SupabaseClient,
  userId: string
): Promise<CreditBalance> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", userId)
    .single();
  const plan = asPlanKey(profile?.subscription_tier);

  const [{ data: planRow }, { data: usageRows }, { data: grantRows }] = await Promise.all([
    supabase.from("subscription_plans").select("credit_limits").eq("key", plan).single(),
    supabase
      .from("credit_usage")
      .select("type, amount, source")
      .eq("user_id", userId)
      .gte("created_at", monthWindowStart()),
    supabase
      .from("credit_grants")
      .select("remaining, expires_at")
      .eq("user_id", userId)
      .is("revoked_at", null)
      .gt("remaining", 0),
  ]);

  const configuredLimits = planRow?.credit_limits as Partial<Record<CreditType, unknown>> | null;
  const limits = Object.fromEntries(
    CREDIT_TYPES.map((type) => {
      const configured = Number(configuredLimits?.[type]);
      return [type, Number.isFinite(configured) && configured >= 0 ? configured : PLAN_LIMITS[plan][type]];
    })
  ) as Record<CreditType, number>;
  const used = Object.fromEntries(CREDIT_TYPES.map((type) => [type, 0])) as Record<CreditType, number>;

  for (const row of usageRows || []) {
    if (row.source === "purchased" || !CREDIT_TYPES.includes(row.type as CreditType)) continue;
    const type = row.type as CreditType;
    used[type] += Number(row.amount) || 0;
  }

  const remaining = Object.fromEntries(
    CREDIT_TYPES.map((type) => [type, Math.max(limits[type] - used[type], 0)])
  ) as Record<CreditType, number>;
  const now = Date.now();
  const extraRemaining = (grantRows || []).reduce((sum, row) => {
    if (row.expires_at && new Date(row.expires_at).getTime() <= now) return sum;
    return sum + (Number(row.remaining) || 0);
  }, 0);

  return { plan, limits, used, remaining, extraRemaining };
}
