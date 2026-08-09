"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import {
  annualTotal,
  asPlanKey,
  ONE_TIME_OFFERS,
  type BillingPeriod,
  type PricingView,
  type SubscriptionPlan,
} from "@/lib/plans";
import { CREDIT_PACKS } from "@/lib/credit-packs";

export default function PricingCards({
  plans,
  currentPlan,
}: {
  plans: SubscriptionPlan[];
  currentPlan: string;
}) {
  const [view, setView] = useState<PricingView>("monthly");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activePlan = asPlanKey(currentPlan);
  const billingPeriod: BillingPeriod = view === "annual" ? "annual" : "monthly";

  async function openPortal() {
    setLoadingPlan("portal");
    setError(null);
    const response = await fetch("/api/stripe/portal", { method: "POST" });
    const result = await response.json();
    setLoadingPlan(null);
    if (!response.ok) {
      setError(result.error || "Could not open billing settings.");
      return;
    }
    window.location.assign(result.url);
  }

  async function choosePlan(planKey: string) {
    if (planKey === "free" || planKey === activePlan) return;

    if (activePlan !== "free") {
      await openPortal();
      return;
    }

    setLoadingPlan(planKey);
    setError(null);
    const response = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ plan: planKey, billingPeriod }),
    });
    const result = await response.json();
    setLoadingPlan(null);
    if (!response.ok) {
      setError(result.error || "Could not start checkout.");
      return;
    }
    window.location.assign(result.url);
  }

  async function buyCredits(packKey: string) {
    setLoadingPlan(`credits:${packKey}`);
    setError(null);
    const response = await fetch("/api/stripe/credits/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ pack: packKey }),
    });
    const result = await response.json();
    setLoadingPlan(null);
    if (!response.ok) {
      setError(result.error || "Could not start credit checkout.");
      return;
    }
    window.location.assign(result.url);
  }

  return (
    <div>
      <div className="mb-8 flex flex-col items-center gap-3">
        <div className="inline-flex flex-wrap justify-center rounded-xl border border-border bg-surface p-1" aria-label="Pricing options">
          {(["monthly", "annual", "one_time"] as PricingView[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setView(option)}
              className={`rounded-lg px-5 py-2.5 text-sm font-semibold transition ${
                view === option ? "bg-accent text-accent-foreground" : "text-muted hover:text-foreground"
              }`}
            >
              {option === "annual" ? "Yearly · save 10%" : option === "one_time" ? "One-time services" : "Monthly"}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted">
          {view === "annual"
            ? "Whole-number pricing with one payment per year."
            : view === "one_time"
              ? "Add human publishing expertise without changing your membership."
              : "Simple monthly pricing. Change or cancel in billing settings."}
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-md border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {view === "one_time" ? (
        <div className="grid gap-5 lg:grid-cols-3">
          {ONE_TIME_OFFERS.map((offer) => (
            <article key={offer.key} className="flex min-h-[26rem] flex-col rounded-2xl border border-border bg-surface p-6">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">One-time service</p>
              <h2 className="font-display mt-5 text-2xl leading-tight">{offer.name}</h2>
              <p className="mt-5 text-4xl font-bold">{offer.price}</p>
              <p className="mt-4 text-sm leading-6 text-muted">{offer.description}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-muted">
                {offer.features.map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <Check size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link href="/dashboard/services" className="mt-7 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-4 py-3 text-sm font-bold text-accent-foreground transition hover:brightness-110">
                Explore this service <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {plans.map((plan) => {
            const isCurrent = plan.key === activePlan;
            const annual = annualTotal(plan.price_monthly);
            const displayedMonthly = view === "annual" ? annual / 12 : plan.price_monthly;
            return (
              <article
                key={plan.key}
                className={`relative flex min-h-[29rem] flex-col rounded-2xl border p-6 ${
                  plan.recommended
                    ? "border-accent bg-[linear-gradient(155deg,rgba(63,208,201,0.12),rgba(17,22,24,0.96))] shadow-[0_0_35px_rgba(63,208,201,0.08)]"
                    : isCurrent
                      ? "border-[#d0a45d] bg-surface"
                      : "border-border bg-surface"
                }`}
              >
                {plan.recommended && (
                  <span className="absolute right-4 top-4 flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-accent-foreground">
                    <Sparkles size={11} /> Best value
                  </span>
                )}
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-muted">{plan.name}</p>
                <div className="mt-5">
                  <span className="font-display text-4xl">${displayedMonthly.toFixed(0)}</span>
                  <span className="text-sm text-muted"> / month</span>
                </div>
                <p className="mt-2 min-h-5 text-xs text-muted">
                  {plan.price_monthly === 0
                    ? "No card required"
                    : view === "annual"
                      ? `$${annual.toFixed(0)} billed yearly`
                      : "Billed monthly"}
                </p>

                <ul className="mt-6 flex-1 space-y-3 text-sm text-muted">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex gap-2">
                      <Check size={15} className="mt-0.5 shrink-0 text-accent" aria-hidden="true" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={() => void choosePlan(plan.key)}
                  disabled={isCurrent || loadingPlan !== null || plan.key === "free"}
                  className={`mt-7 w-full rounded-md px-4 py-3 text-sm font-bold transition disabled:cursor-default disabled:opacity-55 ${
                    plan.recommended ? "bg-accent text-accent-foreground hover:brightness-110" : "border border-border hover:bg-surface-2"
                  }`}
                >
                  {isCurrent
                    ? "Current plan"
                    : plan.key === "free"
                      ? "Free forever"
                      : loadingPlan === plan.key || loadingPlan === "portal"
                        ? "Opening…"
                        : activePlan === "free"
                          ? `Choose ${plan.name}`
                          : "Change in billing portal"}
                </button>
              </article>
            );
          })}
        </div>
      )}

      {activePlan !== "free" && (
        <button
          type="button"
          onClick={() => void openPortal()}
          disabled={loadingPlan !== null}
          className="mt-6 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-surface disabled:opacity-50"
        >
          {loadingPlan === "portal" ? "Opening…" : "Manage membership, invoices, or cancellation"}
        </button>
      )}

      <section id="credit-packs" className="mt-12 scroll-mt-24 border-t border-border pt-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-accent">Keep the work moving</p>
            <h2 className="font-display mt-2 text-3xl">Add credits without changing your plan.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
              Extra credits do not expire and work across AI writing, reviews, originality checks, cover and audiobook generation, formatting, and submission packages. Included plan credits are always used first.
            </p>
          </div>
          <p className="max-w-sm text-xs leading-5 text-muted sm:text-right">
            One credit is charged when a generation begins, including requests that do not complete successfully.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {CREDIT_PACKS.map((pack) => (
            <article
              key={pack.key}
              className={`relative rounded-2xl border p-6 ${"recommended" in pack && pack.recommended ? "border-accent bg-accent/[0.06]" : "border-border bg-surface"}`}
            >
              {"recommended" in pack && pack.recommended ? (
                <span className="absolute right-4 top-4 rounded-full bg-accent px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-accent-foreground">Best value</span>
              ) : null}
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-muted">{pack.name}</p>
              <p className="font-display mt-4 text-4xl">{pack.credits} <span className="font-sans text-sm text-muted">credits</span></p>
              <p className="mt-2 text-2xl font-semibold">${(pack.priceCents / 100).toFixed(0)}</p>
              <p className="mt-4 min-h-12 text-sm leading-6 text-muted">{pack.description}</p>
              <button
                type="button"
                onClick={() => void buyCredits(pack.key)}
                disabled={loadingPlan !== null}
                className="mt-6 w-full rounded-md bg-accent px-4 py-3 text-sm font-bold text-accent-foreground transition hover:brightness-110 disabled:opacity-50"
              >
                {loadingPlan === `credits:${pack.key}` ? "Opening checkout…" : `Add ${pack.credits} credits`}
              </button>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
