import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { getIdempotencyKey, getStripeCustomerId } from "@/lib/stripe-customer";
import { asPlanKey, HUMAN_EVALUATION_PRICES } from "@/lib/services";

const PRICE_ENV = {
  free: "STRIPE_PRICE_HUMAN_EVALUATION",
  starter: "STRIPE_PRICE_HUMAN_EVALUATION_STARTER",
  author: "STRIPE_PRICE_HUMAN_EVALUATION_AUTHOR",
  pro: "STRIPE_PRICE_HUMAN_EVALUATION_PRO",
  publisher: "STRIPE_PRICE_HUMAN_EVALUATION_PUBLISHER",
} as const;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { manuscriptId?: unknown } | null;
  if (!body || typeof body.manuscriptId !== "string") {
    return NextResponse.json({ error: "Choose a manuscript for evaluation." }, { status: 400 });
  }

  const [{ data: manuscript }, { data: profile }] = await Promise.all([
    supabase
      .from("manuscripts")
      .select("id, title, word_count")
      .eq("id", body.manuscriptId)
      .eq("user_id", user.id)
      .single(),
    supabase.from("profiles").select("subscription_tier").eq("id", user.id).single(),
  ]);
  if (!manuscript) return NextResponse.json({ error: "Manuscript not found." }, { status: 404 });
  if ((manuscript.word_count || 0) > 80000) {
    return NextResponse.json(
      { error: "Manuscripts over 80,000 words need a custom evaluation quote." },
      { status: 400 }
    );
  }

  const tier = asPlanKey(profile?.subscription_tier);
  const price = HUMAN_EVALUATION_PRICES[tier];
  const discountPercent = Math.round((1 - price / HUMAN_EVALUATION_PRICES.free) * 100);
  const envName = PRICE_ENV[tier];
  const priceId = process.env[envName];
  if (!priceId) {
    return NextResponse.json(
      { error: `Human evaluation checkout is not configured yet. Add ${envName} in Vercel.` },
      { status: 503 }
    );
  }

  const serviceRole = createServiceRoleClient();
  const { data: order, error: orderError } = await serviceRole
    .from("service_orders")
    .insert({
      user_id: user.id,
      manuscript_id: manuscript.id,
      service_type: "human_manuscript_evaluation",
      member_tier: tier,
      discount_percent: discountPercent,
      status: "checkout_pending",
      metadata: {
        title: manuscript.title,
        wordCount: manuscript.word_count,
        advertisedPriceUsd: price,
      },
    })
    .select("id")
    .single();
  if (orderError || !order) {
    return NextResponse.json({ error: orderError?.message || "Could not create service order." }, { status: 500 });
  }

  try {
    const customerId = await getStripeCustomerId(supabase, user.id);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
    const metadata = {
      purchase_type: "human_manuscript_evaluation",
      service_order_id: order.id,
      user_id: user.id,
      manuscript_id: manuscript.id,
      member_tier: tier,
      discount_percent: String(discountPercent),
    };
    const session = await getStripe().checkout.sessions.create(
      {
        mode: "payment",
        line_items: [{ price: priceId, quantity: 1 }],
        customer: customerId || undefined,
        customer_email: customerId ? undefined : user.email,
        customer_creation: customerId ? undefined : "always",
        customer_update: customerId ? { address: "auto", name: "auto" } : undefined,
        client_reference_id: user.id,
        metadata,
        payment_intent_data: { metadata },
        automatic_tax: { enabled: true },
        billing_address_collection: "auto",
        tax_id_collection: { enabled: true },
        success_url: `${siteUrl}/dashboard/services?evaluation=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/dashboard/services?evaluation=cancelled`,
      },
      { idempotencyKey: getIdempotencyKey(req) }
    );

    const { error: updateError } = await serviceRole
      .from("service_orders")
      .update({ stripe_checkout_session_id: session.id })
      .eq("id", order.id);
    if (updateError) throw updateError;
    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not start evaluation checkout." },
      { status: 500 }
    );
  }
}
