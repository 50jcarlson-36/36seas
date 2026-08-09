export const CREDIT_PACKS = [
  {
    key: "boost-10",
    name: "Quick boost",
    credits: 10,
    priceCents: 1000,
    description: "Ten extra generation credits for any AI or production action.",
  },
  {
    key: "studio-25",
    name: "Studio pack",
    credits: 25,
    priceCents: 2000,
    description: "A flexible reserve for writing, reviews, covers, formatting, or submission packages.",
    recommended: true,
  },
  {
    key: "press-75",
    name: "Press pack",
    credits: 75,
    priceCents: 5000,
    description: "The strongest per-credit value for active authors and multi-book work.",
  },
] as const;

export type CreditPackKey = (typeof CREDIT_PACKS)[number]["key"];

export function getCreditPack(value: unknown) {
  return CREDIT_PACKS.find((pack) => pack.key === value) || null;
}

