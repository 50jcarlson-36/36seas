import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOperationsActor, recordOperationsEvent } from "@/lib/operations";
import { getStripe } from "@/lib/stripe";

const Input = z.object({
  source: z.enum(["submission_package", "service_order"]),
  id: z.string().uuid(),
  amount: z.number().int().positive().optional(),
  reason: z.enum(["duplicate", "fraudulent", "requested_by_customer"]).default("requested_by_customer"),
});

export async function POST(req: NextRequest) {
  const actor = await getOperationsActor();
  if (!actor?.canManage) return NextResponse.json({ error: "Manager access required." }, { status: 403 });

  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid refund request." }, { status: 400 });
  const input = parsed.data;
  const table = input.source === "submission_package" ? "submission_packages" : "service_orders";
  const { data: payment } = await actor.service
    .from(table)
    .select("id, stripe_payment_intent_id, amount_total, currency")
    .eq("id", input.id)
    .single();

  if (!payment?.stripe_payment_intent_id) {
    return NextResponse.json({ error: "This payment does not have a refundable Stripe payment intent." }, { status: 400 });
  }
  if (input.amount && payment.amount_total && input.amount > payment.amount_total) {
    return NextResponse.json({ error: "Refund amount cannot exceed the original payment." }, { status: 400 });
  }

  try {
    const refund = await getStripe().refunds.create({
      payment_intent: payment.stripe_payment_intent_id,
      amount: input.amount,
      reason: input.reason,
      metadata: { source: input.source, source_id: input.id, initiated_by: actor.user.id },
    });
    await recordOperationsEvent({
      actorId: actor.user.id,
      workType: input.source,
      workId: input.id,
      action: "payment.refund_requested",
      details: { refundId: refund.id, amount: refund.amount, status: refund.status },
    });
    return NextResponse.json({ refund: { id: refund.id, amount: refund.amount, status: refund.status } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Stripe could not create the refund." },
      { status: 400 }
    );
  }
}
