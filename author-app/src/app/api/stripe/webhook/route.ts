import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { sendExpertOrderEmail, sendHumanEvaluationOrderEmail } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";
import type Stripe from "stripe";
import { getCreditPack } from "@/lib/credit-packs";

function objectId(value: string | { id: string } | null): string | null {
  return typeof value === "string" ? value : value?.id || null;
}

async function rememberCustomer(
  supabase: SupabaseClient,
  userId: string,
  customer: Stripe.Checkout.Session["customer"] | Stripe.Subscription["customer"]
) {
  const customerId = objectId(customer);
  if (customerId) {
    const { error } = await supabase
      .from("profiles")
      .update({ stripe_customer_id: customerId })
      .eq("id", userId);
    if (error) throw error;
  }
  return customerId;
}

async function fulfillExpertOrder(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const packageId = session.metadata?.package_id;
  if (!userId || session.metadata?.purchase_type !== "expert_package" || !packageId) return;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return;

  const { data: pkg, error: packageError } = await supabase
    .from("submission_packages")
    .select("metadata, payment_status")
    .eq("id", packageId)
    .eq("user_id", userId)
    .single();
  if (packageError) throw packageError;

  const alreadyFulfilled = pkg.payment_status === "paid";
  const currentMetadata = (pkg.metadata as Record<string, unknown> | null) || {};
  const paidAt = new Date().toISOString();
  const paymentIntentId = objectId(session.payment_intent);
  const customerId = await rememberCustomer(supabase, userId, session.customer);

  const { error: updateError } = await supabase
    .from("submission_packages")
    .update({
      status: "expert_review",
      review_status: "pending",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: paymentIntentId,
      payment_status: "paid",
      amount_total: session.amount_total,
      tax_total: session.total_details?.amount_tax ?? 0,
      currency: session.currency,
      paid_at: paidAt,
      metadata: {
        ...currentMetadata,
        expertService: {
          service: "publication_package",
          paymentStatus: "paid",
          paidAt,
          stripeSessionId: session.id,
          stripeCustomerId: customerId,
        },
      },
    })
    .eq("id", packageId)
    .eq("user_id", userId);
  if (updateError) throw updateError;

  if (!alreadyFulfilled) {
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
    if (profile?.email) {
      await sendExpertOrderEmail({
        to: profile.email,
        manuscriptTitle: typeof currentMetadata.title === "string" ? currentMetadata.title : "your manuscript",
      });
    }
  }
}

async function fulfillHumanEvaluation(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const orderId = session.metadata?.service_order_id;
  if (!userId || session.metadata?.purchase_type !== "human_manuscript_evaluation" || !orderId) return;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return;

  const { data: order, error: orderError } = await supabase
    .from("service_orders")
    .select("status, metadata")
    .eq("id", orderId)
    .eq("user_id", userId)
    .single();
  if (orderError) throw orderError;

  const alreadyFulfilled = order.status === "paid" || order.status === "in_review" || order.status === "complete";
  const metadata = (order.metadata as Record<string, unknown> | null) || {};
  const paidAt = new Date().toISOString();
  const customerId = await rememberCustomer(supabase, userId, session.customer);
  const { error: updateError } = await supabase
    .from("service_orders")
    .update({
      status: "paid",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: objectId(session.payment_intent),
      amount_total: session.amount_total,
      tax_total: session.total_details?.amount_tax ?? 0,
      currency: session.currency,
      paid_at: paidAt,
      metadata: { ...metadata, stripeCustomerId: customerId },
    })
    .eq("id", orderId)
    .eq("user_id", userId);
  if (updateError) throw updateError;

  if (!alreadyFulfilled) {
    const { data: profile } = await supabase.from("profiles").select("email").eq("id", userId).single();
    if (profile?.email) {
      await sendHumanEvaluationOrderEmail({
        to: profile.email,
        manuscriptTitle: typeof metadata.title === "string" ? metadata.title : "your manuscript",
      });
    }
  }
}

async function fulfillCreditPack(supabase: SupabaseClient, session: Stripe.Checkout.Session) {
  const userId = session.client_reference_id || session.metadata?.user_id;
  const pack = getCreditPack(session.metadata?.credit_pack);
  if (!userId || session.metadata?.purchase_type !== "credit_pack" || !pack) return;
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return;

  await rememberCustomer(supabase, userId, session.customer);
  const { error } = await supabase.from("credit_grants").upsert(
    {
      user_id: userId,
      amount: pack.credits,
      remaining: pack.credits,
      source: "purchase",
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: objectId(session.payment_intent),
    },
    { onConflict: "stripe_checkout_session_id", ignoreDuplicates: true }
  );
  if (error) throw error;
}

async function syncSubscription(supabase: SupabaseClient, subscription: Stripe.Subscription) {
  const userId = subscription.metadata.user_id;
  const plan = subscription.metadata.plan;
  if (!userId || !plan) return;

  const customerId = await rememberCustomer(supabase, userId, subscription.customer);
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      plan_key: plan,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
    },
    { onConflict: "stripe_subscription_id" }
  );
  if (error) throw error;

  if (subscription.status === "active" || subscription.status === "trialing") {
    await supabase.from("profiles").update({ subscription_tier: plan }).eq("id", userId);
  } else if (subscription.status === "canceled" || subscription.status === "unpaid") {
    await supabase.from("profiles").update({ subscription_tier: "free" }).eq("id", userId);
  }
}

async function processEvent(supabase: SupabaseClient, event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.purchase_type === "expert_package") {
        await fulfillExpertOrder(supabase, session);
        return;
      }
      if (session.metadata?.purchase_type === "human_manuscript_evaluation") {
        await fulfillHumanEvaluation(supabase, session);
        return;
      }
      if (session.metadata?.purchase_type === "credit_pack") {
        await fulfillCreditPack(supabase, session);
        return;
      }

      const userId = session.client_reference_id || session.metadata?.user_id;
      const plan = session.metadata?.plan;
      const subscriptionId = objectId(session.subscription);
      if (userId && plan && subscriptionId) {
        if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") return;
        const customerId = await rememberCustomer(supabase, userId, session.customer);
        const { error } = await supabase.from("subscriptions").upsert(
          {
            user_id: userId,
            plan_key: plan,
            stripe_customer_id: customerId,
            stripe_subscription_id: subscriptionId,
            status: "active",
          },
          { onConflict: "stripe_subscription_id" }
        );
        if (error) throw error;
        await supabase.from("profiles").update({ subscription_tier: plan }).eq("id", userId);
      }
      return;
    }

    case "checkout.session.async_payment_failed":
    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.metadata?.purchase_type === "expert_package" && session.metadata.package_id) {
        await supabase
          .from("submission_packages")
          .update({
            payment_status: event.type === "checkout.session.expired" ? "expired" : "failed",
            stripe_checkout_session_id: session.id,
          })
          .eq("id", session.metadata.package_id);
      }
      if (session.metadata?.purchase_type === "human_manuscript_evaluation" && session.metadata.service_order_id) {
        await supabase
          .from("service_orders")
          .update({
            status: event.type === "checkout.session.expired" ? "expired" : "failed",
            stripe_checkout_session_id: session.id,
          })
          .eq("id", session.metadata.service_order_id);
      }
      return;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await syncSubscription(supabase, event.data.object as Stripe.Subscription);
      return;

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId = objectId(invoice.parent?.subscription_details?.subscription || null);
      if (subscriptionId) {
        await supabase
          .from("subscriptions")
          .update({ status: "past_due" })
          .eq("stripe_subscription_id", subscriptionId);
      }
      return;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = objectId(charge.payment_intent);
      if (paymentIntentId) {
        await supabase
          .from("submission_packages")
          .update({
            payment_status: charge.amount_refunded >= charge.amount ? "refunded" : "partially_refunded",
            refunded_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", paymentIntentId);
        await supabase
          .from("service_orders")
          .update({
            status: charge.amount_refunded >= charge.amount ? "refunded" : "partially_refunded",
            refunded_at: new Date().toISOString(),
          })
          .eq("stripe_payment_intent_id", paymentIntentId);
        await supabase
          .from("credit_grants")
          .update({ remaining: 0, revoked_at: new Date().toISOString() })
          .eq("stripe_payment_intent_id", paymentIntentId);
      }
      return;
    }

    default:
      return;
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();
  if (!signature || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: "Webhook not configured" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid signature" },
      { status: 400 }
    );
  }

  const supabase = createServiceRoleClient();
  const { error: receiptError } = await supabase.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    status: "processing",
  });

  if (receiptError?.code === "23505") {
    const { data: receipt } = await supabase
      .from("stripe_webhook_events")
      .select("status")
      .eq("event_id", event.id)
      .single();
    if (receipt?.status !== "failed") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    await supabase
      .from("stripe_webhook_events")
      .update({ status: "processing", error: null, processed_at: null })
      .eq("event_id", event.id);
  } else if (receiptError) {
    return NextResponse.json({ error: `Could not record webhook: ${receiptError.message}` }, { status: 500 });
  }

  try {
    await processEvent(supabase, event);
    await supabase
      .from("stripe_webhook_events")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("event_id", event.id);
    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await supabase
      .from("stripe_webhook_events")
      .update({ status: "failed", error: message, processed_at: new Date().toISOString() })
      .eq("event_id", event.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
