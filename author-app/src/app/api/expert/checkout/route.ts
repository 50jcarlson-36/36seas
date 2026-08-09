import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getIdempotencyKey, getStripeCustomerId } from "@/lib/stripe-customer";
import { asPlanKey, READINESS_DISCOUNTS } from "@/lib/services";
import type { PlanKey } from "@/lib/plans";

const PRICE_ENV: Record<PlanKey, string> = {
  free: "STRIPE_PRICE_EXPERT_PACKAGE",
  starter: "STRIPE_PRICE_EXPERT_PACKAGE_STARTER",
  author: "STRIPE_PRICE_EXPERT_PACKAGE_AUTHOR",
  pro: "STRIPE_PRICE_EXPERT_PACKAGE_PRO",
  publisher: "STRIPE_PRICE_EXPERT_PACKAGE_PUBLISHER",
};

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { packageId?: unknown } | null;
  if (!body || typeof body.packageId !== "string") {
    return NextResponse.json({ error: "Build a submission package before requesting expert service." }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();
  const tier = asPlanKey(profile?.subscription_tier);
  const envName = PRICE_ENV[tier];
  const priceId = process.env[envName];
  if (!priceId) {
    return NextResponse.json(
      { error: `Expert checkout is not configured yet. Add ${envName} in Vercel.` },
      { status: 503 }
    );
  }

  const { data: pkg, error } = await supabase
    .from("submission_packages")
    .select("id, manuscript_id, metadata")
    .eq("id", body.packageId)
    .eq("user_id", user.id)
    .single();
  if (error || !pkg) return NextResponse.json({ error: "Submission package not found." }, { status: 404 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
  try {
    const stripe = getStripe();
    const customerId = await getStripeCustomerId(supabase, user.id);
    const paymentMetadata = {
      purchase_type: "expert_package",
      user_id: user.id,
      manuscript_id: pkg.manuscript_id,
      package_id: pkg.id,
      member_tier: tier,
      discount_percent: String(READINESS_DISCOUNTS[tier]),
    };
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        customer: customerId || undefined,
        customer_email: customerId ? undefined : user.email,
        customer_creation: customerId ? undefined : "always",
        customer_update: customerId ? { address: "auto", name: "auto" } : undefined,
        client_reference_id: user.id,
        metadata: paymentMetadata,
        payment_intent_data: { metadata: paymentMetadata },
        automatic_tax: { enabled: true },
        billing_address_collection: "auto",
        tax_id_collection: { enabled: true },
        success_url: `${siteUrl}/dashboard/manuscripts/${pkg.manuscript_id}?expert=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/dashboard/manuscripts/${pkg.manuscript_id}?expert=cancelled`,
      },
      { idempotencyKey: getIdempotencyKey(req) }
    );

    const serviceRole = createServiceRoleClient();
    const { error: packageUpdateError } = await serviceRole
      .from("submission_packages")
      .update({ stripe_checkout_session_id: session.id, payment_status: "checkout_created" })
      .eq("id", pkg.id)
      .eq("user_id", user.id);
    if (packageUpdateError) throw packageUpdateError;

    return NextResponse.json({ url: session.url });
  } catch (checkoutError) {
    return NextResponse.json(
      { error: checkoutError instanceof Error ? checkoutError.message : "Could not start expert checkout." },
      { status: 500 }
    );
  }
}
