"use client";

import { useState } from "react";
import { ArrowRight, BookCheck, PenTool, ShieldCheck, Users } from "lucide-react";
import type { PlanKey } from "@/lib/plans";
import {
  GHOSTWRITING_DISCOUNTS,
  GHOSTWRITING_STARTING_PRICE,
  HUMAN_EVALUATION_PRICES,
} from "@/lib/services";

type ManuscriptOption = { id: string; title: string; word_count: number | null };

export default function ExpertServices({
  tier,
  manuscripts,
}: {
  tier: PlanKey;
  manuscripts: ManuscriptOption[];
}) {
  const [manuscriptId, setManuscriptId] = useState(manuscripts[0]?.id || "");
  const [evaluationBusy, setEvaluationBusy] = useState(false);
  const [evaluationError, setEvaluationError] = useState<string | null>(null);
  const [genre, setGenre] = useState("");
  const [targetWordCount, setTargetWordCount] = useState("50000");
  const [brief, setBrief] = useState("");
  const [requestBusy, setRequestBusy] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestSent, setRequestSent] = useState(false);

  const evaluationPrice = HUMAN_EVALUATION_PRICES[tier];
  const evaluationSavings = HUMAN_EVALUATION_PRICES.free - evaluationPrice;
  const ghostDiscount = GHOSTWRITING_DISCOUNTS[tier];
  const memberGhostStart = Math.round(GHOSTWRITING_STARTING_PRICE * (1 - ghostDiscount / 100));

  async function startEvaluationCheckout() {
    if (!manuscriptId) return;
    setEvaluationBusy(true);
    setEvaluationError(null);
    const response = await fetch("/api/services/evaluation/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ manuscriptId }),
    });
    const result = await response.json();
    setEvaluationBusy(false);
    if (!response.ok) {
      setEvaluationError(result.error || "Could not start checkout.");
      return;
    }
    window.location.assign(result.url);
  }

  async function submitGhostwritingRequest(event: React.FormEvent) {
    event.preventDefault();
    setRequestBusy(true);
    setRequestError(null);
    const response = await fetch("/api/services/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manuscriptId: manuscriptId || null,
        genre,
        targetWordCount: Number(targetWordCount),
        brief,
      }),
    });
    const result = await response.json();
    setRequestBusy(false);
    if (!response.ok) {
      setRequestError(result.error || "Could not submit your request.");
      return;
    }
    setRequestSent(true);
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-2xl border border-[#d0a45d]/40 bg-[radial-gradient(circle_at_85%_0%,rgba(208,164,93,0.18),transparent_36%),#101315] p-7 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[1fr_0.8fr] lg:items-end">
          <div>
            <div className="flex items-center gap-3 text-[#d0a45d]">
              <BookCheck size={22} aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-[0.2em]">Human manuscript evaluation</p>
            </div>
            <h2 className="font-display mt-4 text-3xl sm:text-4xl">A real editor reads the book—not just the score.</h2>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-muted">
              For manuscripts up to 80,000 words, a 36Seas-managed editor assesses structure, voice,
              pacing, audience fit, publication readiness, and revision priorities. You receive a clear
              written evaluation and recommended next steps. This is an assessment, not line editing.
            </p>
            <div className="mt-6 grid gap-3 text-sm sm:grid-cols-3">
              <span className="rounded-lg border border-border bg-black/20 p-3">Editorial letter</span>
              <span className="rounded-lg border border-border bg-black/20 p-3">Revision priorities</span>
              <span className="rounded-lg border border-border bg-black/20 p-3">Market-readiness view</span>
            </div>
          </div>

          <div className="rounded-xl border border-[#d0a45d]/35 bg-black/25 p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-muted">Your {tier} rate</p>
            <div className="mt-2 flex items-end gap-3">
              <p className="font-display text-4xl">${evaluationPrice}</p>
              {evaluationSavings > 0 && (
                <p className="pb-1 text-sm text-[#d0a45d]">Save ${evaluationSavings}</p>
              )}
            </div>
            {tier !== "free" && <p className="mt-1 text-xs text-muted">Standard rate $899</p>}
            <label className="mt-5 block text-xs font-semibold uppercase tracking-wide text-muted">
              Manuscript
              <select
                value={manuscriptId}
                onChange={(event) => setManuscriptId(event.target.value)}
                className="mt-2 w-full rounded-md border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground"
              >
                {manuscripts.length === 0 && <option value="">Upload a manuscript first</option>}
                {manuscripts.map((manuscript) => (
                  <option key={manuscript.id} value={manuscript.id}>
                    {manuscript.title} {manuscript.word_count ? `(${manuscript.word_count.toLocaleString()} words)` : ""}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => void startEvaluationCheckout()}
              disabled={!manuscriptId || evaluationBusy}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-[#d0a45d] px-5 py-3 text-sm font-bold text-[#11100d] hover:brightness-110 disabled:opacity-45"
            >
              {evaluationBusy ? "Opening checkout…" : "Reserve human evaluation"}
              {!evaluationBusy && <ArrowRight size={16} aria-hidden="true" />}
            </button>
            {evaluationError && <p className="mt-3 text-xs text-red-300">{evaluationError}</p>}
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-accent/30 bg-[linear-gradient(145deg,#0d1719,#10131a)] p-7 sm:p-9">
        <div className="grid gap-10 lg:grid-cols-[0.8fr_1fr]">
          <div>
            <div className="flex items-center gap-3 text-accent">
              <PenTool size={22} aria-hidden="true" />
              <p className="text-xs font-bold uppercase tracking-[0.2em]">Managed ghostwriting</p>
            </div>
            <h2 className="font-display mt-4 text-3xl">Your ideas. Your voice. A managed writing team.</h2>
            <p className="mt-4 text-sm leading-7 text-muted">
              36Seas scopes the book, matches a vetted global writer, and adds editorial oversight,
              milestone reviews, confidentiality, and a written rights assignment. Projects are quoted
              by word count, research, interviews, and complexity—not sold as anonymous bulk writing.
            </p>
            <div className="mt-6 rounded-xl border border-accent/25 bg-accent/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-accent">Typical starting point</p>
              <p className="font-display mt-2 text-3xl">${memberGhostStart.toLocaleString()}</p>
              <p className="mt-1 text-sm text-muted">
                {ghostDiscount > 0
                  ? `${ghostDiscount}% ${tier} member discount applied to the approved project quote.`
                  : "Projects generally start at $5,000. Upgrade for preferred member rates."}
              </p>
            </div>
            <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <span className="flex items-center gap-2"><ShieldCheck size={16} className="text-accent" /> NDA + rights assignment</span>
              <span className="flex items-center gap-2"><Users size={16} className="text-accent" /> 36Seas editorial oversight</span>
            </div>
          </div>

          {requestSent ? (
            <div className="flex min-h-80 items-center rounded-xl border border-accent/35 bg-accent/5 p-7">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">Request received</p>
                <h3 className="font-display mt-3 text-2xl">We’ll scope the crossing.</h3>
                <p className="mt-3 text-sm leading-6 text-muted">
                  The 36Seas team will review your brief and follow up with questions or a milestone-based proposal.
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={submitGhostwritingRequest} className="rounded-xl border border-border bg-black/20 p-6">
              <p className="font-display text-xl">Request a private project quote</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Genre
                  <input
                    value={genre}
                    onChange={(event) => setGenre(event.target.value)}
                    placeholder="Business, memoir, thriller…"
                    className="mt-2 w-full rounded-md border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground"
                  />
                </label>
                <label className="text-xs font-semibold uppercase tracking-wide text-muted">
                  Target words
                  <input
                    type="number"
                    min="10000"
                    max="200000"
                    step="5000"
                    value={targetWordCount}
                    onChange={(event) => setTargetWordCount(event.target.value)}
                    className="mt-2 w-full rounded-md border border-border bg-background px-3 py-3 text-sm normal-case tracking-normal text-foreground"
                  />
                </label>
              </div>
              <label className="mt-4 block text-xs font-semibold uppercase tracking-wide text-muted">
                Project brief
                <textarea
                  required
                  minLength={40}
                  rows={7}
                  value={brief}
                  onChange={(event) => setBrief(event.target.value)}
                  placeholder="Tell us what the book should accomplish, what material already exists, the audience, voice, research needs, and desired timeline."
                  className="mt-2 w-full rounded-md border border-border bg-background px-3 py-3 text-sm normal-case leading-6 tracking-normal text-foreground"
                />
              </label>
              <button
                type="submit"
                disabled={requestBusy}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-accent px-5 py-3 text-sm font-bold text-accent-foreground hover:brightness-110 disabled:opacity-50"
              >
                {requestBusy ? "Sending request…" : "Request confidential quote"}
                {!requestBusy && <ArrowRight size={16} aria-hidden="true" />}
              </button>
              {requestError && <p className="mt-3 text-xs text-red-300">{requestError}</p>}
            </form>
          )}
        </div>
      </section>
    </div>
  );
}
