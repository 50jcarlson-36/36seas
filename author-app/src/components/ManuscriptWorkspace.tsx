"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, FileCheck2 } from "lucide-react";
import { AI_WRITING_PARTNER_NAME } from "@/lib/brand";
import { asPlanKey } from "@/lib/plans";
import { READINESS_DISCOUNTS } from "@/lib/services";
import {
  computeFullCoverSpec,
  validateFullCoverPageCount,
  type Binding,
  type PaperType,
} from "@/lib/kdp-specs";
import ManuscriptEditor from "@/components/ManuscriptEditor";
import { ORIGINALITY_OWNERSHIP_CLAUSE } from "@/lib/legal";

type Manuscript = {
  id: string;
  title: string;
  subtitle: string | null;
  genre: string | null;
  synopsis: string | null;
  word_count: number | null;
  status: string;
  page_count_interior: number | null;
  isbn_paperback: string | null;
  isbn_hardcover: string | null;
  isbn_ebook: string | null;
};

type Review = {
  id: string;
  status: string;
  overall_score: number | null;
  summary: string | null;
  developmental_notes: { category: string; note: string; severity: string; locationHint?: string }[];
  line_edits: { original: string; suggestion: string; reason: string }[];
  readability: { gradeLevel?: string; pacingAssessment?: string; voiceConsistency?: string; strengths?: string[]; marketPositioning?: string };
  error: string | null;
  created_at: string;
};

type Cover = {
  id: string;
  prompt: string;
  style: string | null;
  image_path: string | null;
  status: string;
  error: string | null;
  created_at: string;
  variant: "front" | "paperback_wrap" | "hardcover_wrap";
  spec: Record<string, unknown> | null;
};

type FormatJob = {
  id: string;
  format_type: string;
  trim_size: string;
  file_path: string | null;
  status: string;
  error: string | null;
  created_at: string;
};

type SubmissionPackage = {
  id: string;
  metadata: Record<string, unknown>;
  package_path: string | null;
  status: string;
  created_at: string;
};

type OriginalityStatus = {
  ready: boolean;
  completeCount: number;
  totalCount: number;
  legalAccepted: boolean;
  chapters: Array<{
    index: number;
    title: string;
    current: boolean;
    ready: boolean;
    check?: {
      id: string;
      provider: string;
      status: "running" | "passed" | "flagged" | "failed";
      similarity_percent: number | null;
      acknowledged_at: string | null;
      error: string | null;
      matches: Array<{ title: string; url?: string; matchedWords?: number; passages?: string[]; explanation?: string; severity?: "low" | "medium" | "high" }>;
    };
  }>;
};

const TABS = ["Write", "Review", "Cover", "Format", "Audio", "Submit"] as const;

const TRIM_SIZE_OPTIONS = [
  {
    value: "5x8",
    dimensions: "5 × 8 in",
    name: "Compact paperback",
    examples: "Novellas, poetry, short fiction",
    feel: "Small, intimate, and easy to carry",
    targetPages: "120–240",
    targetWords: "27,000–54,000",
    wordsPerPage: 225,
    previewWidth: 40,
    previewHeight: 64,
    recommended: false,
  },
  {
    value: "5.25x8",
    dimensions: "5.25 × 8 in",
    name: "Classic novel",
    examples: "Fiction, memoir, literary work",
    feel: "A familiar bookstore paperback",
    targetPages: "200–360",
    targetWords: "48,000–86,000",
    wordsPerPage: 240,
    previewWidth: 42,
    previewHeight: 64,
    recommended: false,
  },
  {
    value: "5.5x8.5",
    dimensions: "5.5 × 8.5 in",
    name: "Trade paperback",
    examples: "Novels and general nonfiction",
    feel: "Comfortable reading with more room",
    targetPages: "200–360",
    targetWords: "50,000–90,000",
    wordsPerPage: 250,
    previewWidth: 44,
    previewHeight: 68,
    recommended: false,
  },
  {
    value: "6x9",
    dimensions: "6 × 9 in",
    name: "Standard trade",
    examples: "Business, self-help, long novels",
    feel: "The most versatile professional size",
    targetPages: "180–320",
    targetWords: "50,000–88,000",
    wordsPerPage: 275,
    previewWidth: 48,
    previewHeight: 72,
    recommended: true,
  },
  {
    value: "8.5x11",
    dimensions: "8.5 × 11 in",
    name: "Workbook or manual",
    examples: "Workbooks, textbooks, large visuals",
    feel: "Letter-sized with maximum page space",
    targetPages: "80–220",
    targetWords: "32,000–88,000",
    wordsPerPage: 400,
    previewWidth: 68,
    previewHeight: 88,
    recommended: false,
  },
] as const;

function trimLabel(value: string) {
  const option = TRIM_SIZE_OPTIONS.find((item) => item.value === value);
  return option ? ` — ${option.name}` : "";
}

const COVER_STYLE_OPTIONS = [
  {
    value: "Cinematic Thriller",
    name: "Cinematic thriller",
    eyebrow: "High tension",
    examples: "Thrillers, dystopian fiction, science fiction",
    feel: "A story-rich scene, dramatic scale, and an unforgettable focal image",
    referenceImage: "/cover-directions/cinematic-thriller.jpg",
    imageAlt: "36Seas cinematic thriller cover art direction",
    recommended: true,
  },
  {
    value: "Dark Legend",
    name: "Dark legend",
    eyebrow: "Mythic atmosphere",
    examples: "Dark fantasy, horror, folklore, epic mystery",
    feel: "A richly built world with ominous atmosphere and iconic symbolism",
    referenceImage: "/cover-directions/dark-legend.jpg",
    imageAlt: "36Seas dark fantasy cover art direction",
    recommended: false,
  },
  {
    value: "Conceptual Narrative",
    name: "Conceptual narrative",
    eyebrow: "Human transformation",
    examples: "Memoir, personal growth, leadership, literary nonfiction",
    feel: "A bold visual metaphor with emotional movement and human stakes",
    referenceImage: "/cover-directions/conceptual-narrative.jpg",
    imageAlt: "36Seas conceptual nonfiction cover art direction",
    recommended: false,
  },
  {
    value: "Future Forward",
    name: "Future forward",
    eyebrow: "Technology with energy",
    examples: "AI, innovation, product design, future-facing business",
    feel: "Immersive technology imagery with depth, light, and premium shelf presence",
    referenceImage: "/cover-directions/future-forward.jpg",
    imageAlt: "36Seas future-facing technology cover art direction",
    recommended: false,
  },
  {
    value: "Editorial Impact",
    name: "Editorial impact",
    eyebrow: "Big idea, clear promise",
    examples: "Business strategy, playbooks, thought leadership",
    feel: "Commanding title hierarchy paired with a distinctive conceptual image",
    referenceImage: "/cover-directions/editorial-impact.jpg",
    imageAlt: "36Seas editorial business cover art direction",
    recommended: false,
  },
] as const;

function CoverStylePreview({ option }: { option: (typeof COVER_STYLE_OPTIONS)[number] }) {
  return (
    <span className="relative block aspect-[2/3] overflow-hidden rounded-sm bg-[#08090a] shadow-[9px_9px_0_rgba(0,0,0,0.38)] ring-1 ring-white/10">
      <Image
        src={option.referenceImage}
        alt={option.imageAlt}
        fill
        sizes="(min-width: 1024px) 180px, (min-width: 640px) 220px, 96px"
        className="object-cover transition duration-500 group-hover:scale-[1.025]"
      />
      <span className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-white/[0.035]" />
      <span className="absolute bottom-2 left-2 rounded-sm border border-white/15 bg-black/65 px-1.5 py-1 text-[6px] font-bold uppercase tracking-[0.14em] text-white/80 backdrop-blur-sm">
        36Seas reference
      </span>
    </span>
  );
}

export default function ManuscriptWorkspace({
  manuscript,
  authorName,
  subscriptionTier,
  initialStoryCredits,
  initialReviews,
  initialCovers,
  initialFormats,
  initialPackages,
}: {
  manuscript: Manuscript;
  authorName: string;
  subscriptionTier: string;
  initialStoryCredits: number;
  initialReviews: Review[];
  initialCovers: Cover[];
  initialFormats: FormatJob[];
  initialPackages: SubmissionPackage[];
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Write");
  const router = useRouter();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border bg-[#0b0e10]/95 backdrop-blur-xl">
        <div className="flex min-h-16 items-center gap-3 px-3 sm:px-5">
          <Link
            href="/dashboard/manuscripts"
            className="inline-flex shrink-0 items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:border-accent hover:text-foreground"
            aria-label="Back to manuscript library"
          >
            <ArrowLeft size={14} aria-hidden="true" />
            <span className="hidden sm:inline">Library</span>
          </Link>

          <div className="hidden min-w-0 border-l border-border pl-3 sm:block">
            <p className="truncate text-sm font-semibold text-foreground">{manuscript.title}</p>
            <p className="hidden truncate text-[10px] text-muted sm:block">
              {manuscript.genre || "Manuscript"} · {manuscript.word_count ? `${manuscript.word_count.toLocaleString()} words` : "Counting words"}
            </p>
          </div>

          <nav className="ml-auto flex min-w-0 items-stretch gap-0.5 overflow-x-auto" aria-label="Book production stages">
            {TABS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                aria-current={tab === t ? "page" : undefined}
                className={`relative shrink-0 px-3 py-5 text-xs font-semibold transition sm:px-4 ${
                  tab === t ? "text-foreground" : "text-muted hover:text-foreground"
                }`}
              >
                {t}
                {tab === t ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" /> : null}
              </button>
            ))}
          </nav>

          <div className="hidden shrink-0 items-center gap-2 border-l border-border pl-4 text-[10px] text-muted 2xl:flex">
            <FileCheck2 size={14} className="text-accent" aria-hidden="true" />
            <span className="capitalize">{manuscript.status.replace("_", " ")}</span>
          </div>
        </div>
      </header>

      <div className={tab === "Write" ? "p-2 sm:p-3" : "mx-auto max-w-7xl p-4 sm:p-6"}>
        {tab === "Write" && (
          <ManuscriptEditor
            manuscriptId={manuscript.id}
            title={manuscript.title}
            genre={manuscript.genre}
            initialStoryCredits={initialStoryCredits}
          />
        )}
        {tab === "Review" && (
          <ReviewTab manuscriptId={manuscript.id} initialReviews={initialReviews} onDone={() => router.refresh()} />
        )}
        {tab === "Cover" && (
          <CoverTab
            manuscriptId={manuscript.id}
            title={manuscript.title}
            subtitle={manuscript.subtitle}
            genre={manuscript.genre}
            synopsis={manuscript.synopsis}
            authorName={authorName}
            pageCountInterior={manuscript.page_count_interior}
            finalTrimSize={initialFormats.find((format) => format.format_type === "pdf_print" && format.status === "complete")?.trim_size || null}
            initialCovers={initialCovers}
            onDone={() => router.refresh()}
          />
        )}
        {tab === "Format" && (
          <FormatTab
            manuscriptId={manuscript.id}
            initialFormats={initialFormats}
            pageCountInterior={manuscript.page_count_interior}
            wordCount={manuscript.word_count || 0}
            onDone={() => router.refresh()}
          />
        )}
        {tab === "Audio" && <AudioTab manuscriptId={manuscript.id} />}
        {tab === "Submit" && (
          <SubmitTab
            manuscriptId={manuscript.id}
            manuscript={manuscript}
            authorName={authorName}
            subscriptionTier={subscriptionTier}
            initialPackages={initialPackages}
            hasEpub={initialFormats.some((f) => f.format_type === "epub" && f.status === "complete")}
            hasPdf={initialFormats.some((f) => f.format_type === "pdf_print" && f.status === "complete")}
            hasCover={initialCovers.some((c) => c.variant === "front" && c.status === "complete")}
            onDone={() => router.refresh()}
          />
        )}
      </div>
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-surface p-6">{children}</div>;
}

function ErrorBanner({ message }: { message: string }) {
  const creditIssue = /credit|upgrade|plan/i.test(message);
  return (
    <div className="rounded-md border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
      <p>{message}</p>
      {creditIssue ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/dashboard/pricing" className="rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground">Upgrade plan</Link>
          <Link href="/dashboard/pricing#credit-packs" className="rounded-md border border-red-300/30 px-3 py-2 text-xs font-bold text-red-100">Add extra credits</Link>
        </div>
      ) : null}
    </div>
  );
}

function SeverityBadge({ severity }: { severity: string }) {
  const colors: Record<string, string> = {
    minor: "bg-surface-2 text-muted",
    moderate: "bg-amber-900/40 text-amber-300",
    major: "bg-red-900/40 text-red-300",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs uppercase tracking-wide ${colors[severity] || colors.minor}`}>
      {severity}
    </span>
  );
}

// ---------- Review ----------

function ReviewTab({
  manuscriptId,
  initialReviews,
  onDone,
}: {
  manuscriptId: string;
  initialReviews: Review[];
  onDone: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [originality, setOriginality] = useState<OriginalityStatus | null>(null);
  const [originalityError, setOriginalityError] = useState<string | null>(null);
  const [checkingChapter, setCheckingChapter] = useState<number | null>(null);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const latest = initialReviews[0];

  const refreshOriginality = useCallback(async () => {
    const response = await fetch(`/api/originality/status?manuscriptId=${encodeURIComponent(manuscriptId)}`);
    const json = await response.json();
    if (!response.ok) {
      setOriginalityError(json.error || "Could not load originality status");
      return;
    }
    setOriginality(json);
    setOriginalityError(null);
  }, [manuscriptId]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void refreshOriginality(); }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshOriginality]);

  useEffect(() => {
    const hasRunningCheck = originality?.chapters.some((chapter) => chapter.check?.status === "running");
    if (!hasRunningCheck) return;
    const timer = window.setTimeout(() => { void refreshOriginality(); }, 3500);
    return () => window.clearTimeout(timer);
  }, [originality, refreshOriginality]);

  async function runOriginality(chapterIndex: number) {
    setCheckingChapter(chapterIndex);
    setOriginalityError(null);
    const response = await fetch("/api/originality/check", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manuscriptId, chapterIndex }),
    });
    const json = await response.json();
    setCheckingChapter(null);
    if (!response.ok) {
      setOriginalityError(json.error || "Originality check failed");
      return;
    }
    await refreshOriginality();
  }

  async function acknowledgeCheck(checkId: string) {
    const response = await fetch("/api/originality/acknowledge", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ checkId }),
    });
    const json = await response.json();
    if (!response.ok) setOriginalityError(json.error || "Could not acknowledge this result");
    else await refreshOriginality();
  }

  async function acceptTerms() {
    setAcceptingTerms(true);
    const response = await fetch("/api/legal/accept", { method: "POST" });
    const json = await response.json();
    setAcceptingTerms(false);
    if (!response.ok) setOriginalityError(json.error || "Could not record acceptance");
    else await refreshOriginality();
  }

  async function runReview() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/review/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manuscriptId }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Review failed");
      return;
    }
    onDone();
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Publishing clearance · ChatGPT-powered first pass</p>
            <h2 className="font-display mt-1 text-xl">Originality risk review, chapter by chapter</h2>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted">
              Each review uses one originality credit. A changed chapter must be checked again. Every current chapter must pass—or have a flagged result reviewed and acknowledged—before export or submission.
            </p>
          </div>
          <div className={`rounded-md border px-4 py-3 text-center ${originality?.ready && originality.legalAccepted ? "border-emerald-700/60 bg-emerald-950/30" : "border-accent/35 bg-accent/[0.06]"}`}>
            <p className="text-2xl font-semibold text-foreground">{originality?.completeCount ?? 0}/{originality?.totalCount ?? "—"}</p>
            <p className="text-[10px] uppercase tracking-[0.14em] text-muted">chapters cleared</p>
          </div>
        </div>

        {originality && !originality.legalAccepted ? (
          <div className="mt-5 rounded-md border border-amber-700/40 bg-amber-950/20 p-4">
            <p className="text-sm font-semibold text-foreground">Required publishing-rights acceptance</p>
            <p className="mt-2 text-xs leading-5 text-muted">{ORIGINALITY_OWNERSHIP_CLAUSE}</p>
            <button type="button" disabled={acceptingTerms} onClick={acceptTerms} className="mt-3 rounded-md bg-accent px-4 py-2 text-xs font-bold text-accent-foreground disabled:opacity-50">
              {acceptingTerms ? "Recording acceptance…" : "I affirm and accept"}
            </button>
          </div>
        ) : null}

        <div className="mt-5 space-y-2">
          {originality?.chapters.map((chapter) => {
            const check = chapter.check;
            const isAiRiskReview = check?.provider === "openai-risk-review";
            const label = !chapter.current ? "Needs current review" : check?.status === "passed" ? "Passed" : check?.status === "flagged" && check.acknowledged_at ? "Reviewed" : check?.status || "Not checked";
            return (
              <div key={chapter.index} className="rounded-md border border-border bg-background p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold"><span className="mr-2 text-accent">{String(chapter.index + 1).padStart(2, "0")}</span>{chapter.title}</p>
                    <p className="mt-1 text-xs text-muted">{label}{chapter.current && check?.similarity_percent != null ? isAiRiskReview ? ` · ${check.similarity_percent}/100 review priority` : ` · ${check.similarity_percent}% similarity` : ""}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {chapter.current && check?.status === "flagged" && !check.acknowledged_at ? (
                      <button type="button" onClick={() => acknowledgeCheck(check.id)} className="rounded-md border border-accent px-3 py-2 text-xs font-semibold text-accent">Acknowledge result</button>
                    ) : null}
                    {!chapter.ready && check?.status !== "running" ? (
                      <button type="button" onClick={() => runOriginality(chapter.index)} disabled={checkingChapter !== null} className="rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground disabled:opacity-50">
                        {checkingChapter === chapter.index ? "Reviewing chapter…" : chapter.current ? "Run again · 1 credit" : "Review chapter · 1 credit"}
                      </button>
                    ) : null}
                  </div>
                </div>
                {check?.matches?.length ? (
                  <div className="mt-3 border-t border-border pt-3 text-xs">
                    {check.matches.slice(0, 5).map((match, index) => (
                      <div key={`${match.url || match.title}-${index}`} className="mt-2">
                        {match.url ? <a href={match.url} target="_blank" rel="noreferrer" className="font-semibold text-accent hover:underline">{match.title}</a> : <span className="font-semibold">{match.title}</span>}
                        {match.matchedWords ? <span className="text-muted"> · {match.matchedWords} matched words</span> : null}
                        {match.passages?.map((passage) => <mark key={passage} className="mt-1 block rounded bg-amber-900/35 px-2 py-1 text-amber-100">{passage}</mark>)}
                        {match.explanation ? <p className="mt-1 leading-5 text-muted">{match.explanation}</p> : null}
                      </div>
                    ))}
                  </div>
                ) : null}
                {check?.error ? <p className="mt-2 text-xs text-red-300">{check.error}</p> : null}
              </div>
            );
          })}
        </div>
        {originalityError ? <div className="mt-4"><ErrorBanner message={originalityError} /></div> : null}
        <p className="mt-4 text-[10px] leading-4 text-muted">This ChatGPT-powered first pass identifies authorship, attribution, repetition, and formulaic-language risks in the supplied chapter only. It does not search the web or a plagiarism database, identify matching sources, prove originality, or make a legal determination. A dedicated Originality.ai comparison is planned. Flagged results require author review, and the rights language and production Terms must be reviewed by 36Seas legal counsel before launch.</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg">AI editorial review</h2>
            <p className="mt-1 text-sm text-muted">
              A developmental edit covering structure, pacing, character, prose, and market positioning — plus
              concrete line edits pulled from your own text.
            </p>
          </div>
          <button
            onClick={runReview}
            disabled={loading}
            className="shrink-0 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Reviewing…" : latest ? "Run new review" : "Run review"}
          </button>
        </div>
        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}
      </Card>

      {latest && latest.status === "complete" && (
        <>
          <Card>
            <div className="flex items-baseline justify-between">
              <h3 className="font-display text-lg">Overall score</h3>
              <span className="font-display text-3xl text-accent">{latest.overall_score}/10</span>
            </div>
            <p className="mt-3 text-sm text-muted">{latest.summary}</p>
            {latest.readability?.strengths && (
              <ul className="mt-4 list-inside list-disc space-y-1 text-sm">
                {latest.readability.strengths.map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <h3 className="font-display text-lg">Developmental notes</h3>
            <div className="mt-4 space-y-3">
              {latest.developmental_notes.map((n, i) => (
                <div key={i} className="border-b border-border pb-3 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-wide text-accent">{n.category}</span>
                    <SeverityBadge severity={n.severity} />
                  </div>
                  <p className="mt-1 text-sm">{n.note}</p>
                  {n.locationHint && <p className="mt-0.5 text-xs text-muted">{n.locationHint}</p>}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-display text-lg">Line edits</h3>
            <div className="mt-4 space-y-4">
              {latest.line_edits.map((e, i) => (
                <div key={i} className="rounded-md border border-border p-3">
                  <p className="text-sm text-muted line-through">{e.original}</p>
                  <p className="mt-1 text-sm text-accent">{e.suggestion}</p>
                  <p className="mt-1 text-xs text-muted">{e.reason}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-display text-lg">Readability & market</h3>
            <dl className="mt-3 space-y-2 text-sm">
              <div>
                <dt className="text-muted">Grade level</dt>
                <dd>{latest.readability?.gradeLevel}</dd>
              </div>
              <div>
                <dt className="text-muted">Pacing</dt>
                <dd>{latest.readability?.pacingAssessment}</dd>
              </div>
              <div>
                <dt className="text-muted">Voice consistency</dt>
                <dd>{latest.readability?.voiceConsistency}</dd>
              </div>
              <div>
                <dt className="text-muted">Market positioning</dt>
                <dd>{latest.readability?.marketPositioning}</dd>
              </div>
            </dl>
          </Card>
        </>
      )}

      {latest && latest.status === "failed" && <ErrorBanner message={latest.error || "Review failed"} />}
    </div>
  );
}

// ---------- Cover ----------

function CoverTab({
  manuscriptId,
  title,
  subtitle,
  genre,
  synopsis,
  authorName,
  pageCountInterior,
  finalTrimSize,
  initialCovers,
  onDone,
}: {
  manuscriptId: string;
  title: string;
  subtitle: string | null;
  genre: string | null;
  synopsis: string | null;
  authorName: string;
  pageCountInterior: number | null;
  finalTrimSize: string | null;
  initialCovers: Cover[];
  onDone: () => void;
}) {
  const [prompt, setPrompt] = useState(
    genre ? `A striking ${genre.toLowerCase()} cover that fits the tone of "${title}".` : ""
  );
  const [style, setStyle] = useState("Cinematic Thriller");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const selectedStyle = COVER_STYLE_OPTIONS.find((option) => option.value === style) || COVER_STYLE_OPTIONS[0];

  async function generate() {
    setLoading(true);
    setError(null);
    setPreviewUrl(null);
    const res = await fetch("/api/cover/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manuscriptId, prompt, style }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Cover generation failed");
      return;
    }
    setPreviewUrl(json.previewUrl);
    onDone();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display text-lg">Cover designer</h2>
        <p className="mt-1 text-sm text-muted">
          Choose the shelf presence readers should feel before they read a word. {AI_WRITING_PARTNER_NAME} uses your manuscript,
          direction, and selected art direction to create original cover art with OpenAI GPT Image.
        </p>

        <div className="mt-5 space-y-5">
          <div>
            <label className="text-sm font-semibold text-foreground" htmlFor="cover-art-direction">Tell the art director what matters</label>
            <p className="mt-1 text-xs leading-5 text-muted">Mention a setting, symbol, character, mood, or important object. You can leave the visual decisions to {AI_WRITING_PARTNER_NAME}.</p>
            <textarea
              id="cover-art-direction"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <fieldset>
            <legend className="text-sm font-semibold text-foreground">Choose your shelf direction</legend>
            <p className="mt-1 max-w-3xl text-xs leading-5 text-muted">These are real 36Seas production references—not generic templates. Your title receives original art built from its own story, audience, and genre.</p>

            <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {COVER_STYLE_OPTIONS.map((option) => {
                const selected = option.value === style;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setStyle(option.value)}
                    className={`group relative flex min-h-64 gap-4 rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-col ${
                      selected
                        ? "border-accent bg-accent/[0.08] shadow-[0_0_28px_rgba(208,164,93,0.08)]"
                        : "border-border bg-background hover:border-accent/55 hover:bg-surface-2"
                    }`}
                  >
                    <span className="w-20 shrink-0 transition group-hover:-translate-y-0.5 sm:w-full sm:px-3" aria-hidden="true">
                      <CoverStylePreview option={option} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="mb-1 block text-[8px] font-bold uppercase tracking-[0.16em] text-accent/80">{option.eyebrow}</span>
                      <span className="flex items-start justify-between gap-2">
                        <span className="font-display text-lg text-foreground">{option.name}</span>
                        {selected ? (
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                            <Check size={12} strokeWidth={3} aria-hidden="true" />
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-2 block text-xs leading-5 text-muted">{option.examples}</span>
                      {option.recommended ? (
                        <span className="mt-3 inline-flex rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-accent">
                          Strong starting point
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-3 rounded-lg border border-accent/25 bg-accent/[0.045] px-4 py-3">
              <p className="text-sm text-foreground">
                <span className="font-semibold">Your direction: {selectedStyle.name}.</span>{" "}
                <span className="text-muted">{selectedStyle.feel}.</span>
              </p>
            </div>
          </fieldset>
        </div>

        <button
          onClick={generate}
          disabled={loading}
          className="mt-4 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? `${AI_WRITING_PARTNER_NAME} is art-directing…` : "Create original cover art"}
        </button>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}
      </Card>

      {previewUrl && (
        <Card>
          <h3 className="font-display text-lg">Latest concept</h3>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewUrl} alt="Cover concept" className="mt-3 max-w-xs rounded-md border border-border" />
        </Card>
      )}

      <CoverSystemPreview
        title={title}
        subtitle={subtitle}
        authorName={authorName}
        synopsis={synopsis}
        frontImage={previewUrl || selectedStyle.referenceImage}
        pageCount={pageCountInterior}
      />

      <FullCoverGenerator
        manuscriptId={manuscriptId}
        pageCountInterior={pageCountInterior}
        finalTrimSize={finalTrimSize}
        paperbackWraps={initialCovers.filter((cover) => cover.variant === "paperback_wrap")}
        hardcoverWraps={initialCovers.filter((cover) => cover.variant === "hardcover_wrap")}
        onDone={onDone}
      />

      {initialCovers.filter((cover) => cover.variant === "front").length > 0 && (
        <Card>
          <h3 className="font-display text-lg">History</h3>
          <div className="mt-3 space-y-2 text-sm">
            {initialCovers.filter((cover) => cover.variant === "front").map((c) => (
              <div key={c.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <span className="text-muted">{c.prompt.slice(0, 60) || "—"}</span>
                <span className="text-xs uppercase tracking-wide text-accent">{c.status}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function CoverSystemPreview({
  title,
  subtitle,
  authorName,
  synopsis,
  frontImage,
  pageCount,
}: {
  title: string;
  subtitle: string | null;
  authorName: string;
  synopsis: string | null;
  frontImage: string;
  pageCount: number | null;
}) {
  const spec = useMemo(
    () => (pageCount ? computeFullCoverSpec("paperback", "6x9", pageCount, "white") : null),
    [pageCount]
  );
  const spineWidth = spec ? Math.max(18, Math.min(42, (spec.spineWidthIn / 6) * 320)) : 22;
  const backCopy = synopsis || "Your final back cover brings together a compelling book description, author positioning, publisher identity, and a print-safe barcode area.";

  return (
    <Card>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent">The complete edition</p>
          <h3 className="font-display mt-1 text-2xl">Front. Spine. Back. One publishing system.</h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
            The front earns attention. The spine carries the title on a shelf. The back sells the promise and presents the 36Seas imprint, description, author, and ISBN area with professional hierarchy.
          </p>
        </div>
        <div className="rounded-md border border-accent/30 bg-accent/[0.06] px-4 py-2 text-right">
          <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-accent">Spine calculation</p>
          <p className="mt-1 text-sm font-semibold text-foreground">{pageCount ? `${pageCount} pages · ${spec?.spineWidthIn}\"` : "Set after print formatting"}</p>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-xl border border-white/10 bg-[#050607] p-4 sm:p-7">
        <div className="mx-auto flex min-w-[650px] max-w-[960px] items-stretch justify-center drop-shadow-[0_24px_38px_rgba(0,0,0,0.48)]">
          <section className="relative aspect-[2/3] w-[42%] overflow-hidden border border-white/10 bg-[radial-gradient(circle_at_20%_15%,#283236_0%,#101416_42%,#070809_100%)] p-[5%] text-[#f2eadb]">
            <p className="text-[7px] font-bold uppercase tracking-[0.2em] text-[#d0a45d]">Stories worth crossing oceans for</p>
            <p className="mt-[12%] line-clamp-6 font-display text-[clamp(8px,1.05vw,14px)] leading-[1.45]">{backCopy}</p>
            <div className="absolute inset-x-[8%] bottom-[7%] flex items-end justify-between gap-4">
              <div>
                <Image src="/brand/36seas-wave.svg" alt="" width={56} height={24} className="h-auto w-10" />
                <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.18em]">36Seas Publishing</p>
                <p className="mt-1 text-[6px] uppercase tracking-[0.14em] text-white/55">36seas.com</p>
              </div>
              <div className="flex h-12 w-20 items-center justify-center border border-dashed border-white/35 bg-white/5 text-center text-[5px] uppercase tracking-wider text-white/50">ISBN / barcode</div>
            </div>
          </section>

          <section className="relative shrink-0 overflow-hidden border-y border-white/10 bg-[#bf8d45] text-[#0a0b0c]" style={{ width: spineWidth }}>
            <p className="absolute left-1/2 top-1/2 whitespace-nowrap text-[8px] font-bold uppercase tracking-[0.13em]" style={{ transform: "translate(-50%, -50%) rotate(-90deg)" }}>{title} · {authorName}</p>
            <Image src="/brand/36seas-wave.svg" alt="" width={28} height={12} className="absolute bottom-3 left-1/2 h-auto w-5 -translate-x-1/2 brightness-0" />
          </section>

          <section className="relative aspect-[2/3] w-[42%] overflow-hidden border border-white/10 bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={frontImage} alt="Selected 36Seas cover direction shown on the front panel" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />
            {frontImage.startsWith("http") ? (
              <div className="absolute inset-x-[8%] bottom-[6%]">
                <p className="font-display text-[clamp(12px,1.8vw,24px)] font-bold leading-none text-white drop-shadow-lg">{title}</p>
                {subtitle && <p className="mt-1 text-[7px] uppercase tracking-[0.12em] text-white/80">{subtitle}</p>}
                <p className="mt-3 text-[7px] font-semibold uppercase tracking-[0.2em] text-white">{authorName}</p>
              </div>
            ) : null}
          </section>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {[
          ["Front cover", "Original AI artwork plus exact title, subtitle, and author typography."],
          ["Calculated spine", "Width follows final page count, paper stock, trim, and binding."],
          ["Publisher back cover", "Description, imprint, ISBN area, author information, and retail hierarchy."],
        ].map(([label, description]) => (
          <div key={label} className="rounded-lg border border-border bg-background px-4 py-3">
            <p className="text-xs font-semibold text-foreground">{label}</p>
            <p className="mt-1 text-xs leading-5 text-muted">{description}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ---------- Format ----------

function FormatTab({
  manuscriptId,
  initialFormats,
  pageCountInterior,
  wordCount,
  onDone,
}: {
  manuscriptId: string;
  initialFormats: FormatJob[];
  pageCountInterior: number | null;
  wordCount: number;
  onDone: () => void;
}) {
  const [trimSize, setTrimSize] = useState("6x9");
  const [loadingType, setLoadingType] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});
  const selectedTrim = TRIM_SIZE_OPTIONS.find((option) => option.value === trimSize) || TRIM_SIZE_OPTIONS[3];
  const estimatedDraftPages = Math.max(Math.ceil(wordCount / selectedTrim.wordsPerPage) + 6, 1);

  const estimatedSpine = useMemo(() => {
    if (!pageCountInterior) return null;
    return computeFullCoverSpec("paperback", trimSize, pageCountInterior, "white");
  }, [pageCountInterior, trimSize]);

  async function runFormat(formatType: "epub" | "pdf_print" | "docx") {
    setLoadingType(formatType);
    setError(null);
    const res = await fetch("/api/format/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manuscriptId, formatType, trimSize }),
    });
    const json = await res.json();
    setLoadingType(null);
    if (!res.ok) {
      setError(json.error || "Formatting failed");
      return;
    }
    setLinks((prev) => ({ ...prev, [formatType]: json.downloadUrl }));
    onDone();
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display text-lg">KDP formatter</h2>
        <p className="mt-1 text-sm text-muted">
          Create a print-ready PDF with page numbers and an exact TOC, a reflowable EPUB with a linked TOC, or an editable Word copy. Each new export uses one formatting credit.
        </p>

        <fieldset className="mt-6">
          <legend className="text-sm font-semibold text-foreground">Choose the book readers will hold</legend>
          <p className="mt-1 text-xs leading-5 text-muted">
            Trim size is the finished width and height of every printed page. Choose by the kind of book you are making—not just the numbers.
          </p>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {TRIM_SIZE_OPTIONS.map((option) => {
              const selected = option.value === trimSize;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTrimSize(option.value)}
                  className={`group relative flex min-h-48 gap-4 rounded-lg border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent sm:flex-col ${
                    selected
                      ? "border-accent bg-accent/[0.08] shadow-[0_0_28px_rgba(208,164,93,0.08)]"
                      : "border-border bg-background hover:border-accent/55 hover:bg-surface-2"
                  }`}
                >
                  <span className="flex h-24 w-20 shrink-0 items-center justify-center" aria-hidden="true">
                    <span
                      className={`relative h-20 rounded-[2px] border shadow-[6px_5px_0_rgba(0,0,0,0.28)] transition group-hover:-translate-y-0.5 ${
                        selected ? "border-accent bg-[#25211a]" : "border-[#56514a] bg-[#191c1e]"
                      }`}
                      style={{ width: option.previewWidth, height: option.previewHeight }}
                    >
                      <span className={`absolute inset-x-2 top-3 h-px ${selected ? "bg-accent/80" : "bg-muted/40"}`} />
                      <span className="absolute inset-x-2 top-6 h-px bg-muted/25" />
                      <span className="absolute inset-x-2 top-8 h-px bg-muted/25" />
                      <span className="absolute inset-x-2 top-10 h-px bg-muted/25" />
                    </span>
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold uppercase tracking-[0.12em] text-accent">{option.dimensions}</span>
                      {selected ? (
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
                          <Check size={12} strokeWidth={3} aria-hidden="true" />
                        </span>
                      ) : null}
                    </span>
                    <span className="font-display mt-2 block text-lg text-foreground">{option.name}</span>
                    <span className="mt-2 block text-xs leading-5 text-muted">{option.examples}</span>
                    <span className="mt-3 block border-t border-border/70 pt-2 text-[10px] leading-4 text-muted">
                      Typical target: <strong className="font-semibold text-foreground">{option.targetPages} pages</strong><br />
                      {option.targetWords} words
                    </span>
                    {option.recommended ? (
                      <span className="mt-3 inline-flex rounded-full border border-accent/40 bg-accent/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.13em] text-accent">
                        Most versatile
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex flex-col gap-2 rounded-lg border border-accent/25 bg-accent/[0.045] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-foreground">
              <span className="font-semibold">Your choice: {selectedTrim.name}.</span>{" "}
              <span className="text-muted">{selectedTrim.feel}.</span>
              <span className="mt-1 block text-xs text-muted">
                Your current {wordCount.toLocaleString()} words plan to roughly {estimatedDraftPages.toLocaleString()} interior pages at this size.
                A typical target is {selectedTrim.targetPages} pages / {selectedTrim.targetWords} words.
              </span>
            </p>
            <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.13em] text-accent">{selectedTrim.dimensions}</p>
          </div>
          <p className="mt-2 text-[10px] leading-4 text-muted">
            Planning estimates help set a writing target. The production spine always uses the actual page count from the final print PDF.
          </p>
        </fieldset>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={() => runFormat("epub")}
            disabled={loadingType !== null}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {loadingType === "epub" ? "Building EPUB…" : "Generate EPUB (Kindle)"}
          </button>
          <button
            onClick={() => runFormat("docx")}
            disabled={loadingType !== null}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
          >
            {loadingType === "docx" ? "Building Word copy…" : "Generate DOCX (Word)"}
          </button>
          <button
            onClick={() => runFormat("pdf_print")}
            disabled={loadingType !== null}
            className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:border-accent disabled:opacity-50"
          >
            {loadingType === "pdf_print" ? "Building PDF…" : "Generate print PDF"}
          </button>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {Object.entries(links).length > 0 && (
          <div className="mt-4 space-y-1 text-sm">
            {Object.entries(links).map(([type, url]) => (
              <a key={type} href={url} className="block text-accent hover:underline">
                Download {type === "epub" ? "EPUB" : type === "docx" ? "DOCX" : "print PDF"} →
              </a>
            ))}
          </div>
        )}

        <div className="mt-5 rounded-md border border-border bg-background p-4 text-sm">
          {pageCountInterior ? (
            <>
              <p className="text-muted">
                Interior page count: <span className="text-foreground">{pageCountInterior}</span> (from the last
                print PDF generated)
              </p>
              {estimatedSpine && (
                <p className="mt-1 text-muted">
                  Estimated paperback spine width at {trimSize}:{" "}
                  <span className="text-foreground">{estimatedSpine.spineWidthIn}&quot;</span>
                  {!estimatedSpine.spineTextAllowed && " — under 79 pages, no spine text"}
                </p>
              )}
              <p className="mt-1 text-xs text-muted">
                Your page count is ready. Build the exact paperback or hardcover wrap in the Cover tab.
              </p>
            </>
          ) : (
            <p className="text-muted">
              Generate the print PDF above to get a page count — the Cover tab uses it to calculate the spine and
              full wraparound dimensions.
            </p>
          )}
        </div>
      </Card>

      {initialFormats.length > 0 && (
        <Card>
          <h3 className="font-display text-lg">History</h3>
          <div className="mt-3 space-y-2 text-sm">
            {initialFormats.map((f) => (
              <div key={f.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <span className="text-muted">
                  {f.format_type === "epub" ? "EPUB" : f.format_type === "docx" ? "DOCX (editable Word copy)" : `Print PDF (${f.trim_size})`}
                </span>
                <span className="text-xs uppercase tracking-wide text-accent">{f.status}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------- Audio ----------

function AudioTab({ manuscriptId }: { manuscriptId: string }) {
  const [estimate, setEstimate] = useState<{ credits: number; wordCount: number; characterCount: number; chapterCount: number; estimatedMinutes: number; productionEnabled: boolean } | null>(null);
  const [voices, setVoices] = useState<Array<{ id: string; name: string; gender: string; age: string; emotions: string[] }>>([]);
  const [voiceCatalogMessage, setVoiceCatalogMessage] = useState<string | null>(null);
  const [voiceId, setVoiceId] = useState("");
  const [voiceName, setVoiceName] = useState("");
  const [style, setStyle] = useState("smart");
  const [pace, setPace] = useState("1");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const selectedVoice = voices.find((voice) => voice.id === voiceId);

  useEffect(() => {
    void Promise.all([
      fetch(`/api/audiobook/estimate?manuscriptId=${encodeURIComponent(manuscriptId)}`)
        .then(async (response) => ({ ok: response.ok, json: await response.json() }))
        .then(({ ok, json }) => ok ? setEstimate(json) : setError(json.error || "Could not estimate audiobook")),
      fetch("/api/audiobook/voices")
        .then(async (response) => ({ ok: response.ok, json: await response.json() }))
        .then(({ ok, json }) => {
          if (!ok) setVoiceCatalogMessage(json.error || "The narrator catalog is unavailable.");
          else {
            setVoices(json.voices || []);
            setVoiceCatalogMessage(json.message || null);
          }
        }),
    ]).catch(() => setError("Could not load audiobook production details"));
  }, [manuscriptId]);

  function selectVoice(id: string) {
    setVoiceId(id);
    setVoiceName(voices.find((voice) => voice.id === id)?.name || "");
    setStyle("smart");
  }

  async function createAudiobook() {
    setLoading(true);
    setError(null);
    const response = await fetch("/api/audiobook/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manuscriptId, voiceId, voiceName, style, pace: Number(pace) }),
    });
    const json = await response.json();
    setLoading(false);
    if (!response.ok) setError(json.error || "Audiobook generation failed");
    else setDownloadUrl(json.downloadUrl);
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Premium production</p>
            <h2 className="font-display mt-2 text-2xl">Turn the finished book into an audiobook.</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">Choose a licensed narrator voice, emotional direction, and pace. 36Seas creates chaptered audio following the book&apos;s live table of contents.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              {["Select a narrator", "Preview the direction", "Generate chaptered audio"].map((item, index) => (
                <div key={item} className="rounded-md border border-border bg-background p-4"><p className="text-xs text-accent">0{index + 1}</p><p className="mt-1 text-sm font-semibold">{item}</p></div>
              ))}
            </div>
          </div>
          <div className="rounded-lg border border-accent/30 bg-accent/[0.06] p-5">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-accent">Your estimate</p>
            <p className="mt-3 font-display text-3xl">{estimate?.credits ?? "—"} credits</p>
            <p className="mt-2 text-xs leading-5 text-muted">{estimate ? `${estimate.wordCount.toLocaleString()} words · about ${estimate.estimatedMinutes} minutes · ${estimate.chapterCount} chapters` : "Reading the current manuscript…"}</p>
            <Link href="/dashboard/pricing#credit-packs" className="mt-4 inline-flex text-xs font-bold text-accent hover:underline">Top up audio credits →</Link>
          </div>
        </div>

        <div className="mt-8 grid gap-4 border-t border-border pt-6 md:grid-cols-2">
          <label className="text-xs font-semibold text-muted md:col-span-2">Licensed audiobook narrator
            <select value={voiceId} onChange={(event) => selectVoice(event.target.value)} disabled={!voices.length} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50">
              <option value="">{voices.length ? "Choose a narrator" : "Narrator catalog not connected"}</option>
              {voices.map((voice) => <option key={voice.id} value={voice.id}>{voice.name} · {voice.age.replaceAll("_", " ")} · {voice.gender}</option>)}
            </select>
            {voiceCatalogMessage ? <span className="mt-2 block font-normal text-amber-300">{voiceCatalogMessage}</span> : null}
          </label>
          <label className="text-xs font-semibold text-muted">Narration style
            <select value={style} onChange={(event) => setStyle(event.target.value)} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
              <option value="smart">Smart emotion</option>
              {selectedVoice?.emotions.map((emotion) => <option key={emotion} value={emotion}>{emotion.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <label className="text-xs font-semibold text-muted">Pace
            <select value={pace} onChange={(event) => setPace(event.target.value)} className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"><option value="0.88">Measured</option><option value="1">Natural</option><option value="1.12">Brisk</option></select>
          </label>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="button" onClick={createAudiobook} disabled={loading || !voiceId || !voiceName || !estimate?.productionEnabled} className="rounded-md bg-accent px-5 py-3 text-sm font-bold text-accent-foreground disabled:opacity-40">{loading ? "Creating audiobook…" : "Create audiobook"}</button>
          {!estimate?.productionEnabled ? <p className="text-xs text-amber-300">Preview only until the provider&apos;s commercial API/distribution agreement is approved. No credit can be charged yet.</p> : null}
          {downloadUrl ? <a href={downloadUrl} className="text-sm font-semibold text-accent hover:underline">Download chaptered audiobook →</a> : null}
        </div>
        {error ? <div className="mt-4"><ErrorBanner message={error} /></div> : null}
      </Card>
    </div>
  );
}

// ---------- Submit ----------

function SubmitTab({
  manuscriptId,
  manuscript,
  authorName,
  subscriptionTier,
  initialPackages,
  hasEpub,
  hasPdf,
  hasCover,
  onDone,
}: {
  manuscriptId: string;
  manuscript: Manuscript;
  authorName: string;
  subscriptionTier: string;
  initialPackages: SubmissionPackage[];
  hasEpub: boolean;
  hasPdf: boolean;
  hasCover: boolean;
  onDone: () => void;
}) {
  const [author, setAuthor] = useState(authorName);
  const [description, setDescription] = useState(manuscript.synopsis || "");
  const [keywords, setKeywords] = useState("");
  const [categories, setCategories] = useState("");
  const [price, setPrice] = useState("4.99");
  const [aiText, setAiText] = useState(false);
  const [aiImages, setAiImages] = useState(false);
  const [autoIsbnPaperback, setAutoIsbnPaperback] = useState(!manuscript.isbn_paperback);
  const [autoIsbnHardcover, setAutoIsbnHardcover] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [latestPackageId, setLatestPackageId] = useState(initialPackages[0]?.id || null);
  const [expertLoading, setExpertLoading] = useState(false);
  const [expertError, setExpertError] = useState<string | null>(null);

  async function createPackage() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/submission/package", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manuscriptId,
        metadata: {
          title: manuscript.title,
          subtitle: manuscript.subtitle,
          author,
          description,
          keywords: keywords.split(",").map((k) => k.trim()).filter(Boolean),
          categories: categories.split(",").map((c) => c.trim()).filter(Boolean),
          price: Number(price),
          aiDisclosure: { text: aiText, images: aiImages, translation: false },
          autoAssignIsbn: { paperback: autoIsbnPaperback, hardcover: autoIsbnHardcover },
        },
      }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Could not build submission package");
      return;
    }
    setDownloadUrl(json.downloadUrl);
    setLatestPackageId(json.packageId);
    onDone();
  }

  async function startExpertCheckout() {
    if (!latestPackageId) return;
    setExpertLoading(true);
    setExpertError(null);
    const res = await fetch("/api/expert/checkout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": crypto.randomUUID(),
      },
      body: JSON.stringify({ packageId: latestPackageId }),
    });
    const json = await res.json();
    if (!res.ok) {
      setExpertLoading(false);
      setExpertError(json.error || "Could not start expert checkout");
      return;
    }
    window.location.href = json.url;
  }

  const ready = hasEpub || hasPdf;
  const memberTier = asPlanKey(subscriptionTier);
  const expertDiscount = READINESS_DISCOUNTS[memberTier];

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="font-display text-lg">Submission packager</h2>
        <p className="mt-1 text-sm text-muted">
          Amazon has no public API for automated KDP uploads, so this bundles your formatted files, full
          wraparound covers, and listing metadata — including the AI-content disclosure KDP requires — into one
          self-service package you can download and upload at kdp.amazon.com. Add the optional 36Seas expert
          service below when you want a publishing professional to inspect the final package.
        </p>

        <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <StatusChip label="EPUB" ok={hasEpub} />
          <StatusChip label="Print PDF" ok={hasPdf} />
          <StatusChip label="Cover" ok={hasCover} />
        </div>

        {!ready && (
          <p className="mt-4 text-sm text-amber-300">
            Generate at least one formatted file in the Format tab before packaging.
          </p>
        )}

        <div className="mt-4">
          <label className="text-sm text-muted">Author name (as it should appear on the cover/listing)</label>
          <input
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
            className="mt-1 w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>

        <div className="mt-6 space-y-3">
          <div>
            <label className="text-sm text-muted">Book description (KDP listing copy)</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-sm text-muted">Keywords (comma-separated, up to 7)</label>
              <input
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="text-sm text-muted">Categories (comma-separated)</label>
              <input
                value={categories}
                onChange={(e) => setCategories(e.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
          </div>
          <div className="max-w-xs">
            <label className="text-sm text-muted">List price (USD)</label>
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="text-sm text-foreground">AI-content disclosure (required by KDP)</p>
            <label className="mt-2 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={aiText} onChange={(e) => setAiText(e.target.checked)} />
              Manuscript text was AI-assisted or AI-generated
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={aiImages} onChange={(e) => setAiImages(e.target.checked)} />
              Cover or interior images were AI-generated
            </label>
          </div>

          <div className="rounded-md border border-border p-3">
            <p className="text-sm text-foreground">ISBN</p>
            <p className="mt-1 text-xs text-muted">
              Pulls the next ISBN from 36Seas&apos; pool (admin-managed). Leave unchecked to use KDP&apos;s free ISBN
              instead.
            </p>
            <label className="mt-2 flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={autoIsbnPaperback}
                onChange={(e) => setAutoIsbnPaperback(e.target.checked)}
                disabled={!!manuscript.isbn_paperback}
              />
              {manuscript.isbn_paperback
                ? `Paperback ISBN already assigned: ${manuscript.isbn_paperback}`
                : "Assign a paperback ISBN from the 36Seas pool"}
            </label>
            <label className="mt-1 flex items-center gap-2 text-sm text-muted">
              <input
                type="checkbox"
                checked={autoIsbnHardcover}
                onChange={(e) => setAutoIsbnHardcover(e.target.checked)}
                disabled={!!manuscript.isbn_hardcover}
              />
              {manuscript.isbn_hardcover
                ? `Hardcover ISBN already assigned: ${manuscript.isbn_hardcover}`
                : "Assign a hardcover ISBN from the 36Seas pool"}
            </label>
          </div>
        </div>

        <button
          onClick={createPackage}
          disabled={loading || !ready}
          className="mt-5 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Packaging…" : "Build submission package"}
        </button>

        {error && (
          <div className="mt-4">
            <ErrorBanner message={error} />
          </div>
        )}

        {downloadUrl && (
          <a href={downloadUrl} className="mt-4 block text-sm text-accent hover:underline">
            Download submission package (.zip) →
          </a>
        )}
      </Card>

      <div className="overflow-hidden rounded-xl border border-[#d0a45d]/45 bg-[radial-gradient(circle_at_top_right,rgba(208,164,93,0.16),transparent_45%),#101315]">
        <div className="grid gap-6 p-6 md:grid-cols-[1fr_auto] md:items-center md:p-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#d0a45d]">36Seas expert service</p>
            <h2 className="font-display mt-2 text-2xl">Put a publishing professional on the final mile.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
              A human expert checks the files, cover assets, listing copy, categories, keywords, AI disclosure,
              and KDP readiness—then returns a clear approval or a prioritized change list. This is a one-time
              paid service; the current fee is shown securely at Stripe checkout.
            </p>
            {expertDiscount > 0 && (
              <p className="mt-3 text-sm font-semibold text-[#d0a45d]">
                Your {memberTier} membership saves {expertDiscount}% on this review.
              </p>
            )}
            <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-foreground">
              <span>✓ File and trim check</span>
              <span>✓ Metadata and discoverability</span>
              <span>✓ Cover-package review</span>
              <span>✓ Human handoff notes</span>
            </div>
          </div>
          <div className="md:text-right">
            <button
              type="button"
              onClick={() => void startExpertCheckout()}
              disabled={!latestPackageId || expertLoading}
              className="rounded-md bg-[#d0a45d] px-5 py-3 text-sm font-bold text-[#11100d] shadow-[0_0_30px_rgba(208,164,93,0.16)] hover:brightness-110 disabled:cursor-default disabled:opacity-45"
            >
              {expertLoading ? "Opening secure checkout…" : "Reserve expert review →"}
            </button>
            {!latestPackageId && <p className="mt-2 max-w-xs text-xs text-muted">Build the submission package above first.</p>}
          </div>
        </div>
        {expertError && <div className="border-t border-red-900/40 px-6 py-3 text-sm text-red-300 md:px-8">{expertError}</div>}
      </div>

      {initialPackages.length > 0 && (
        <Card>
          <h3 className="font-display text-lg">History</h3>
          <div className="mt-3 space-y-2 text-sm">
            {initialPackages.map((p) => (
              <div key={p.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0">
                <span className="text-muted">{new Date(p.created_at).toLocaleString()}</span>
                <span className="text-xs uppercase tracking-wide text-accent">{p.status}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

// ---------- Full wraparound cover (paperback + hardcover) ----------

function FullCoverGenerator({
  manuscriptId,
  pageCountInterior,
  finalTrimSize,
  paperbackWraps,
  hardcoverWraps,
  onDone,
}: {
  manuscriptId: string;
  pageCountInterior: number | null;
  finalTrimSize: string | null;
  paperbackWraps: Cover[];
  hardcoverWraps: Cover[];
  onDone: () => void;
}) {
  const trimSize = finalTrimSize || "6x9";
  const [paperType, setPaperType] = useState<PaperType>("white");
  const [busy, setBusy] = useState<Binding | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [links, setLinks] = useState<Record<string, string>>({});

  const paperbackSpec = useMemo(
    () => (pageCountInterior ? computeFullCoverSpec("paperback", trimSize, pageCountInterior, paperType) : null),
    [pageCountInterior, trimSize, paperType]
  );
  const hardcoverSpec = useMemo(
    () => (pageCountInterior ? computeFullCoverSpec("hardcover", trimSize, pageCountInterior, "white") : null),
    [pageCountInterior, trimSize]
  );
  const paperbackPageError = pageCountInterior ? validateFullCoverPageCount("paperback", pageCountInterior) : null;
  const hardcoverPageError = pageCountInterior ? validateFullCoverPageCount("hardcover", pageCountInterior) : null;

  async function generate(binding: Binding) {
    setBusy(binding);
    setError(null);
    const res = await fetch("/api/cover/full-wrap/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ manuscriptId, binding, trimSize, paperType }),
    });
    const json = await res.json();
    setBusy(null);
    if (!res.ok) {
      setError(json.error || "Full-cover generation failed");
      return;
    }
    setLinks((prev) => ({ ...prev, [binding]: json.downloadUrl }));
    onDone();
  }

  return (
    <Card>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">36Seas production desk</p>
      <h2 className="font-display mt-2 text-2xl">Build the production wrap</h2>
      <p className="mt-1 text-sm text-muted">
        Turn the approved front into one publisher-ready PDF: designed back cover, calculated spine, exact bleed,
        barcode safe area, and the 36Seas imprint. Paperback and hardcover are sized from your final page count and
        production choices using KDP&apos;s published formulas. Verify against{" "}
        <a href="https://kdp.amazon.com/cover-calculator" target="_blank" rel="noreferrer" className="text-accent hover:underline">
          KDP&apos;s own calculator
        </a>{" "}
        before final upload.
      </p>

      {!pageCountInterior && (
        <p className="mt-4 text-sm text-amber-300">
          Generate the print PDF in the Format tab first — spine width depends on the final page count.
        </p>
      )}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-sm text-muted">Final book size</label>
          <div className="mt-1 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
            {finalTrimSize ? `${trimSize} in${trimLabel(trimSize)}` : "Waiting for final print PDF"}
          </div>
          <p className="mt-1 text-[10px] leading-4 text-muted">Locked to the latest completed print interior so the spine and cover cannot drift out of alignment.</p>
        </div>
        <div>
          <label className="text-sm text-muted">Interior paper and print type</label>
          <select
            value={paperType}
            onChange={(e) => setPaperType(e.target.value as PaperType)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          >
            <option value="white">White (B&amp;W)</option>
            <option value="cream">Cream (B&amp;W)</option>
            <option value="standard_color">Standard color</option>
            <option value="premium_color">Premium color</option>
          </select>
        </div>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-foreground">Paperback</p>
              <p className="mt-0.5 text-[11px] text-muted">Flexible cover · bookstore-standard edition</p>
            </div>
            <button
              onClick={() => generate("paperback")}
              disabled={!pageCountInterior || !finalTrimSize || !!paperbackPageError || busy !== null}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy === "paperback" ? "Building…" : "Generate"}
            </button>
          </div>
          {paperbackSpec && (
            <dl className="mt-2 space-y-0.5 text-xs text-muted">
              <div>Spine: {paperbackSpec.spineWidthIn}&quot;</div>
              <div>
                Full cover: {paperbackSpec.fullWidthIn}&quot; x {paperbackSpec.fullHeightIn}&quot;
              </div>
            </dl>
          )}
          {paperbackPageError && <p className="mt-2 text-xs text-amber-300">{paperbackPageError}</p>}
          {links.paperback && (
            <a href={links.paperback} className="mt-2 block text-xs text-accent hover:underline">
              Download PDF →
            </a>
          )}
          {paperbackWraps.length > 0 && (
            <p className="mt-2 text-xs text-muted">{paperbackWraps.length} previously generated</p>
          )}
        </div>

        <div className="rounded-md border border-border p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">Hardcover</p>
                <span className="rounded-full border border-accent/50 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.12em] text-accent">Publisher edition</span>
              </div>
              <p className="mt-0.5 text-[11px] text-muted">Case laminate · premium author and reader edition</p>
            </div>
            <button
              onClick={() => generate("hardcover")}
              disabled={!pageCountInterior || !finalTrimSize || !!hardcoverPageError || busy !== null}
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {busy === "hardcover" ? "Building…" : "Generate"}
            </button>
          </div>
          {hardcoverSpec && (
            <dl className="mt-2 space-y-0.5 text-xs text-muted">
              <div>Spine: {hardcoverSpec.spineWidthIn}&quot;</div>
              <div>
                Full cover: {hardcoverSpec.fullWidthIn}&quot; x {hardcoverSpec.fullHeightIn}&quot;
              </div>
            </dl>
          )}
          {hardcoverPageError && <p className="mt-2 text-xs text-amber-300">{hardcoverPageError}</p>}
          {links.hardcover && (
            <a href={links.hardcover} className="mt-2 block text-xs text-accent hover:underline">
              Download PDF →
            </a>
          )}
          {hardcoverWraps.length > 0 && (
            <p className="mt-2 text-xs text-muted">{hardcoverWraps.length} previously generated</p>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorBanner message={error} />
        </div>
      )}
    </Card>
  );
}

function StatusChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-center ${
        ok ? "border-accent text-accent" : "border-border text-muted"
      }`}
    >
      {label} {ok ? "✓" : "—"}
    </div>
  );
}
