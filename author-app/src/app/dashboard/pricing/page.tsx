import { createClient } from "@/lib/supabase/server";
import PricingCards from "@/components/PricingCards";
import { SUBSCRIPTION_PLANS } from "@/lib/plans";

export default async function PricingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user!.id)
    .single();

  return (
    <div>
      <h1 className="font-display text-2xl">Plan &amp; billing</h1>
      <p className="mt-1 text-sm text-muted">
        Start free, choose monthly or yearly membership, or add a one-time human service when the
        book needs professional publishing judgment. Yearly membership saves 10%.
      </p>
      <div className="mt-8">
        <PricingCards plans={SUBSCRIPTION_PLANS} currentPlan={profile?.subscription_tier || "free"} />
      </div>
    </div>
  );
}
