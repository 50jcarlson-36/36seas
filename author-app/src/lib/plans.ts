export type PlanKey = "free" | "starter" | "author" | "pro" | "publisher";
export type BillingPeriod = "monthly" | "annual";
export type PricingView = BillingPeriod | "one_time";

export type SubscriptionPlan = {
  key: PlanKey;
  name: string;
  price_monthly: number;
  features: string[];
  recommended?: boolean;
};

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    key: "free",
    name: "Free",
    price_monthly: 0,
    features: ["3 AI writing credits monthly", "1 manuscript review", "1 cover generation", "1 formatting export"],
  },
  {
    key: "starter",
    name: "Starter",
    price_monthly: 10,
    features: ["10 AI writing credits monthly", "3 reviews, covers, and formats", "1 submission package", "5% expert-service savings"],
  },
  {
    key: "author",
    name: "Author",
    price_monthly: 20,
    recommended: true,
    features: ["25 AI writing credits monthly", "7 reviews, covers, and formats", "3 submission packages", "10% expert-service savings"],
  },
  {
    key: "publisher",
    name: "Publisher",
    price_monthly: 80,
    features: ["120 AI writing credits monthly", "40 reviews, covers, and formats", "20 submission packages", "Team workspaces and preferred service rates"],
  },
];

export const ONE_TIME_OFFERS = [
  {
    key: "human-evaluation",
    name: "Human manuscript evaluation",
    price: "$899",
    description: "A real editor evaluates a manuscript up to 80,000 words.",
    features: ["Editorial letter", "Revision priorities", "Market-readiness assessment"],
  },
  {
    key: "publication-readiness",
    name: "Publication readiness",
    price: "Quote",
    description: "A professional review of the files, cover, metadata, and KDP package.",
    features: ["File and cover review", "Metadata guidance", "Prioritized publishing checklist"],
  },
  {
    key: "managed-writing",
    name: "Managed writing engagement",
    price: "From $5,000",
    description: "A vetted writing team managed with 36Seas editorial oversight.",
    features: ["Private project scope", "Milestone reviews", "NDA and rights assignment"],
  },
] as const;

export const PLAN_LIMITS: Record<
  PlanKey,
  { review: number; cover: number; format: number; submission: number; story: number; originality: number; audio: number }
> = {
  free: { review: 1, cover: 1, format: 1, submission: 0, story: 3, originality: 1, audio: 0 },
  starter: { review: 3, cover: 3, format: 3, submission: 1, story: 10, originality: 3, audio: 0 },
  author: { review: 7, cover: 7, format: 7, submission: 3, story: 25, originality: 7, audio: 0 },
  pro: { review: 15, cover: 15, format: 15, submission: 8, story: 60, originality: 15, audio: 0 },
  publisher: { review: 40, cover: 40, format: 40, submission: 20, story: 120, originality: 40, audio: 0 },
};

export function asPlanKey(value: unknown): PlanKey {
  return typeof value === "string" && value in PLAN_LIMITS ? (value as PlanKey) : "free";
}

export function annualTotal(monthlyPrice: number): number {
  return Math.round(monthlyPrice * 12 * 0.9 * 100) / 100;
}

export function monthWindowStart() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}
