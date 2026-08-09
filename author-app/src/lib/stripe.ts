import Stripe from "stripe";
import type { BillingPeriod, PlanKey } from "@/lib/plans";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("STRIPE_SECRET_KEY is not set.");
  if (!stripeSingleton) stripeSingleton = new Stripe(process.env.STRIPE_SECRET_KEY);
  return stripeSingleton;
}

type PaidPlan = Exclude<PlanKey, "free">;

export const PRICE_IDS: Record<PaidPlan, Record<BillingPeriod, string | undefined>> = {
  starter: {
    monthly: process.env.STRIPE_PRICE_STARTER_MONTHLY,
    annual: process.env.STRIPE_PRICE_STARTER_ANNUAL,
  },
  author: {
    monthly: process.env.STRIPE_PRICE_AUTHOR_MONTHLY,
    annual: process.env.STRIPE_PRICE_AUTHOR_ANNUAL,
  },
  pro: {
    monthly: process.env.STRIPE_PRICE_PRO_MONTHLY || process.env.STRIPE_PRICE_PRO,
    annual: process.env.STRIPE_PRICE_PRO_ANNUAL,
  },
  publisher: {
    monthly: process.env.STRIPE_PRICE_PUBLISHER_MONTHLY || process.env.STRIPE_PRICE_PUBLISHER,
    annual: process.env.STRIPE_PRICE_PUBLISHER_ANNUAL,
  },
};
