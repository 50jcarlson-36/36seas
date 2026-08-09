import Link from "next/link";
import { ArrowRight, BookOpen, Clock3, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCreditBalance } from "@/lib/credits";
import QuickStartDropzone from "@/components/QuickStartDropzone";
import { AUTHOR_STUDIO_NAME } from "@/lib/brand";

export default async function DashboardHome() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name")
    .eq("id", user!.id)
    .single();

  const credits = await getCreditBalance(supabase, user!.id);

  const { data: manuscripts } = await supabase
    .from("manuscripts")
    .select("id, title, status, word_count, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto max-w-7xl">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">{AUTHOR_STUDIO_NAME}</p>
          <h1 className="font-display mt-2 text-3xl leading-tight sm:text-5xl">What book are we shaping today?</h1>
          <p className="mt-2 text-sm text-muted">
            {profile?.full_name ? `Welcome back, ${profile.full_name}. ` : ""}Start with a thought, bring a draft, or continue a crossing already underway.
          </p>
        </div>
        <Link
          href="/dashboard/story#new-story"
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-accent/50 px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-accent hover:bg-accent/10"
        >
          <Sparkles size={16} className="text-accent" aria-hidden="true" />
          Build from an idea
        </Link>
      </header>

      <section className="relative mt-7 overflow-hidden rounded-2xl border border-accent/30 bg-[radial-gradient(circle_at_82%_18%,rgba(208,164,93,0.14),transparent_34%),linear-gradient(135deg,#111719,#0d1114)] p-5 sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-72 w-72 rounded-full border border-accent/10" />
        <div className="pointer-events-none absolute -right-8 -top-10 h-44 w-44 rounded-full border border-accent/15" />
        <div className="relative z-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-accent">The fastest way into the work</p>
          <h2 className="font-display mt-2 text-2xl sm:text-3xl">Drop the draft. First Mate will open the writing room.</h2>
          <QuickStartDropzone />
        </div>
      </section>

      <section className="mt-9">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-accent"><Clock3 size={14} /> Continue your work</p>
            <h2 className="font-display mt-2 text-2xl">Your books</h2>
          </div>
          <Link href="/dashboard/manuscripts" className="inline-flex items-center gap-1 text-sm text-muted hover:text-accent">
            View library <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {(manuscripts || []).length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-surface p-6 text-sm text-muted lg:col-span-2">
              Your first book will appear here as soon as you upload a draft or build from an idea.
            </div>
          ) : null}
          {(manuscripts || []).map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/manuscripts/${m.id}`}
              className="group flex items-center gap-4 rounded-xl border border-border bg-surface p-4 transition hover:-translate-y-0.5 hover:border-accent/60 hover:bg-surface-2"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-accent">
                <BookOpen size={19} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-foreground">{m.title}</p>
                <p className="mt-1 text-xs text-muted">{m.word_count ? `${m.word_count.toLocaleString()} words` : "Ready to begin"}</p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="hidden rounded-full bg-background px-3 py-1 text-[10px] uppercase tracking-wide text-accent sm:inline">
                  {m.status.replace("_", " ")}
                </span>
                <ArrowRight size={17} className="text-muted transition group-hover:translate-x-1 group-hover:text-accent" aria-hidden="true" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-9 border-t border-border pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <p className="mr-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Available this month</p>
          {(["story", "review", "cover", "format", "submission"] as const).map((type) => (
            <div key={type} className="rounded-full border border-border bg-surface px-3 py-1.5 text-xs text-muted">
              <span className="font-semibold text-foreground">{credits.remaining[type]}</span>{" "}
              {type}
            </div>
          ))}
          {credits.extraRemaining > 0 ? (
            <div className="rounded-full border border-accent/40 bg-accent/5 px-3 py-1.5 text-xs text-muted">
              <span className="font-semibold text-accent">+{credits.extraRemaining}</span> extra
            </div>
          ) : null}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/dashboard/pricing#credit-packs" className="text-xs font-semibold text-muted hover:text-accent">Add credits</Link>
            <Link href="/dashboard/pricing" className="text-xs font-semibold text-accent hover:underline">Upgrade plan</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
