import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCreditPack } from "@/lib/credit-packs";
import { getStripe } from "@/lib/stripe";
import { getIdempotencyKey, getStripeCustomerId } from "@/lib/stripe-customer";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { pack?: unknown } | null;
  const pack = getCreditPack(body?.pack);
  if (!pack) return NextResponse.json({ error: "Choose a valid credit pack." }, { status: 400 });

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  try {
    const stripe = getStripe();
    const customerId = await getStripeCustomerId(supabase, user.id);
    const session = await stripe.checkout.sessions.create(
      {
        mode: "payment",
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: pack.priceCents,
              product_data: {
                name: `36Seas ${pack.name} — ${pack.credits} extra credits`,
                description: pack.description,
              },
            },
          },
        ],
        customer: customerId || undefined,
        customer_email: customerId ? undefined : user.email,
        customer_update: customerId ? { address: "auto", name: "auto" } : undefined,
        client_reference_id: user.id,
        metadata: {
          user_id: user.id,
          purchase_type: "credit_pack",
          credit_pack: pack.key,
          credits: String(pack.credits),
        },
        automatic_tax: { enabled: true },
        billing_address_collection: "auto",
        allow_promotion_codes: true,
        success_url: `${siteUrl}/dashboard/pricing?credits=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/dashboard/pricing?credits=cancelled`,
      },
      { idempotencyKey: getIdempotencyKey(req) }
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Credit checkout failed." },
      { status: 500 }
    );
  }
}

