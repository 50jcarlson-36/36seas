import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, PRICE_IDS } from "@/lib/stripe";
import { getIdempotencyKey, getStripeCustomerId } from "@/lib/stripe-customer";
import { asPlanKey, type BillingPeriod } from "@/lib/plans";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as
    | { plan?: unknown; billingPeriod?: unknown }
    | null;
  const plan = asPlanKey(body?.plan);
  const billingPeriod: BillingPeriod = body?.billingPeriod === "monthly" ? "monthly" : "annual";
  if (plan === "free") {
    return NextResponse.json({ error: "The Free plan does not require checkout." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();
  if (asPlanKey(profile?.subscription_tier) !== "free") {
    return NextResponse.json(
      { error: "You already have a membership. Change plans securely in Billing settings." },
      { status: 409 }
    );
  }
  const priceId = PRICE_IDS[plan][billingPeriod];
  if (!priceId) {
    return NextResponse.json(
      { error: `The ${plan} ${billingPeriod} Stripe price is not configured yet.` },
      { status: 400 }
    );
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const stripe = getStripe();

    const customerId = await getStripeCustomerId(supabase, user.id);

    const session = await stripe.checkout.sessions.create(
      {
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        customer: customerId || undefined,
        customer_email: customerId ? undefined : user.email,
        customer_update: customerId ? { address: "auto", name: "auto" } : undefined,
        client_reference_id: user.id,
        metadata: { user_id: user.id, plan, billing_period: billingPeriod },
        subscription_data: { metadata: { user_id: user.id, plan, billing_period: billingPeriod } },
        automatic_tax: { enabled: true },
        billing_address_collection: "auto",
        tax_id_collection: { enabled: true },
        allow_promotion_codes: true,
        success_url: `${siteUrl}/dashboard?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/dashboard/pricing?checkout=cancelled`,
      },
      { idempotencyKey: getIdempotencyKey(req) }
    );

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
