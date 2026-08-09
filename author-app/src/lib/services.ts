import { asPlanKey, type PlanKey } from "@/lib/plans";

export const HUMAN_EVALUATION_PRICES: Record<PlanKey, number> = {
  free: 899,
  starter: 849,
  author: 799,
  pro: 719,
  publisher: 629,
};

export const READINESS_DISCOUNTS: Record<PlanKey, number> = {
  free: 0,
  starter: 10,
  author: 15,
  pro: 20,
  publisher: 30,
};

export const GHOSTWRITING_DISCOUNTS: Record<PlanKey, number> = {
  free: 0,
  starter: 5,
  author: 10,
  pro: 15,
  publisher: 20,
};

export const GHOSTWRITING_STARTING_PRICE = 5000;

export { asPlanKey };
