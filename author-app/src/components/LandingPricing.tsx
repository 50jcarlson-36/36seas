"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check } from "lucide-react";
import {
  annualTotal,
  ONE_TIME_OFFERS,
  SUBSCRIPTION_PLANS,
  type PricingView,
} from "@/lib/plans";

export default function LandingPricing() {
  const [view, setView] = useState<PricingView>("monthly");

  return (
    <section id="pricing" className="border-y border-[#d0a45d]/15 bg-[#efe7d8] px-5 py-24 text-[#14110d] sm:px-10 lg:px-16 lg:py-32">
      <div className="mx-auto max-w-[1500px]">
        <div className="grid gap-7 lg:grid-cols-[1fr_auto] lg:items-end">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.28em] text-[#8a6428]">Membership that grows with the work</p>
            <h2 className="mt-5 max-w-4xl text-5xl font-black uppercase leading-[0.88] tracking-[-0.045em] sm:text-7xl">
              Start free.
              <span className="font-display block font-normal italic normal-case text-[#8d672b]">Cross farther when ready.</span>
            </h2>
          </div>
          <Link href="/signup" className="group inline-flex items-center justify-center gap-3 bg-[#14110d] px-7 py-4 text-xs font-black uppercase tracking-[0.14em] text-white transition hover:bg-[#8d672b]">
            Get started free <ArrowRight size={15} className="transition group-hover:translate-x-1" />
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-y border-[#b8aa94] py-4">
          <div className="inline-flex rounded-full border border-[#9e7e4c] bg-[#f8f2e8] p-1" aria-label="Pricing options">
            {(["monthly", "annual", "one_time"] as PricingView[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setView(option)}
                className={`rounded-full px-5 py-2 text-xs font-black uppercase tracking-[0.12em] transition ${
                  view === option ? "bg-[#14110d] text-white" : "text-[#6d6254] hover:text-[#14110d]"
                }`}
              >
                {option === "annual" ? "Yearly · save 10%" : option === "one_time" ? "One-time" : "Monthly"}
              </button>
            ))}
          </div>
          <p className="text-sm text-[#645a4d]">
            {view === "annual" ? "One payment each year. Every displayed price stays whole." : view === "one_time" ? "Human services without a recurring membership." : "Simple monthly membership. Cancel or change in billing settings."}
          </p>
        </div>

        {view === "one_time" ? (
          <div className="mt-10 grid border-l border-t border-[#b8aa94] lg:grid-cols-3">
            {ONE_TIME_OFFERS.map((offer) => (
              <article key={offer.key} className="flex min-h-[390px] flex-col border-b border-r border-[#b8aa94] bg-[#f4ecdf] p-7">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#766958]">One-time service</p>
                <h3 className="font-display mt-5 text-3xl leading-tight">{offer.name}</h3>
                <p className="mt-5 text-4xl font-black">{offer.price}</p>
                <p className="mt-4 text-sm leading-6 text-[#5e5549]">{offer.description}</p>
                <ul className="mt-6 flex-1 space-y-3 text-sm text-[#5e5549]">
                  {offer.features.map((feature) => (
                    <li key={feature} className="flex gap-2"><Check size={14} className="mt-1 shrink-0 text-[#b58234]" /> {feature}</li>
                  ))}
                </ul>
                <Link href="/signup" className="group mt-7 inline-flex items-center justify-between border border-[#84735b] px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] transition hover:bg-[#14110d] hover:text-white">
                  Start free to request <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-10 grid border-l border-t border-[#b8aa94] md:grid-cols-2 xl:grid-cols-4">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const annual = annualTotal(plan.price_monthly);
              const displayedPrice = view === "annual" ? annual / 12 : plan.price_monthly;
              return (
                <article key={plan.key} className={`relative flex min-h-[420px] flex-col border-b border-r border-[#b8aa94] p-7 ${plan.recommended ? "bg-[#15120e] text-[#f5eee2]" : "bg-[#f4ecdf]"}`}>
                  {plan.recommended && <span className="absolute right-4 top-4 bg-[#d0a45d] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#16110a]">Best value</span>}
                  <p className={`text-[10px] font-bold uppercase tracking-[0.2em] ${plan.recommended ? "text-[#d0a45d]" : "text-[#766958]"}`}>{plan.name}</p>
                  <p className="mt-7 text-5xl font-black">${displayedPrice.toFixed(0)}</p>
                  <p className={`mt-2 text-xs ${plan.recommended ? "text-[#9f978c]" : "text-[#6d6254]"}`}>
                    {plan.price_monthly === 0 ? "Free to begin · no card" : view === "annual" ? `per month · $${annual.toFixed(0)} billed yearly` : "per month · billed monthly"}
                  </p>
                  <ul className={`mt-7 flex-1 space-y-3 text-sm ${plan.recommended ? "text-[#bdb4a7]" : "text-[#5e5549]"}`}>
                    {plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check size={14} className="mt-1 shrink-0 text-[#b58234]" /> {feature}</li>)}
                  </ul>
                  <Link href="/signup" className={`group mt-7 inline-flex items-center justify-between border px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] transition ${plan.recommended ? "border-[#d0a45d] bg-[#d0a45d] text-[#15110b] hover:bg-[#e2bd77]" : "border-[#84735b] hover:bg-[#14110d] hover:text-white"}`}>
                    {plan.key === "free" ? "Get started free" : `Choose ${plan.name}`} <ArrowRight size={14} className="transition group-hover:translate-x-1" />
                  </Link>
                </article>
              );
            })}
          </div>
        )}
        <p className="mt-5 text-xs text-[#706557]">Membership credits reset monthly. Taxes, where applicable, are calculated securely at checkout. Paid members receive preferred rates for human assistance.</p>
      </div>
    </section>
  );
}
