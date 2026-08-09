"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Character = { name: string; role: string; goal: string; trait: string; arc: string };

type Project = {
  id: string;
  title: string;
  genre: string | null;
  premise: string | null;
  setting: string | null;
  characters: Character[];
  status: string;
  compiled_manuscript_id: string | null;
};

type Chapter = {
  id: string;
  chapter_number: number;
  title: string;
  summary: string | null;
  content: string | null;
  status: string;
  word_count: number | null;
};

export default function StoryWorkspace({
  project,
  initialChapters,
  initialStoryCredits,
}: {
  project: Project;
  initialChapters: Chapter[];
  initialStoryCredits: number;
}) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notes, setNotes] = useState<Record<number, string>>({});
  const [busyChapter, setBusyChapter] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [compiling, setCompiling] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState(initialStoryCredits);
  const router = useRouter();

  const draftedCount = initialChapters.filter((c) => c.status === "drafted").length;
  const totalWords = initialChapters.reduce((sum, c) => sum + (c.word_count || 0), 0);

  async function generateChapter(chapterNumber: number) {
    setBusyChapter(chapterNumber);
    setError(null);
    const res = await fetch("/api/story/chapter/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storyProjectId: project.id,
        chapterNumber,
        authorNotes: notes[chapterNumber],
      }),
    });
    const json = await res.json();
    setBusyChapter(null);
    if (!res.ok) {
      setError(json.error || "Chapter generation failed");
      if (typeof json.balance?.remaining === "number") setRemainingCredits(json.balance.remaining);
      return;
    }
    if (typeof json.credits?.remaining === "number") setRemainingCredits(json.credits.remaining);
    setExpanded(chapterNumber);
    router.refresh();
  }

  async function compile() {
    setCompiling(true);
    setError(null);
    const res = await fetch("/api/story/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ storyProjectId: project.id }),
    });
    const json = await res.json();
    setCompiling(false);
    if (!res.ok) {
      setError(json.error || "Could not compile manuscript");
      return;
    }
    router.push(`/dashboard/manuscripts/${json.manuscriptId}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs uppercase tracking-wide text-accent">{project.genre}</p>
        <h1 className="font-display mt-1 text-2xl">{project.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{project.premise}</p>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted">
          <p>{draftedCount} / {initialChapters.length} chapters drafted · {totalWords.toLocaleString()} words</p>
          <span className="rounded-full border border-border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">
            {remainingCredits} AI writing credits
          </span>
          {remainingCredits <= 3 ? (
            <>
              <Link href="/dashboard/pricing" className="text-xs font-semibold text-accent hover:underline">Upgrade</Link>
              <Link href="/dashboard/pricing#credit-packs" className="text-xs font-semibold text-accent hover:underline">Add credits</Link>
            </>
          ) : null}
        </div>
      </div>

      {project.compiled_manuscript_id && (
        <div className="rounded-md border border-accent/40 bg-surface-2 px-4 py-3 text-sm text-accent">
          Already compiled into a manuscript.{" "}
          <Link href={`/dashboard/manuscripts/${project.compiled_manuscript_id}`} className="underline">
            Open it →
          </Link>
        </div>
      )}

      <div className="rounded-lg border border-border bg-surface p-6">
        <h2 className="font-display text-lg">Characters</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(project.characters || []).map((c, i) => (
            <div key={i} className="rounded-md border border-border p-3 text-sm">
              <p className="text-foreground">{c.name} <span className="text-muted">— {c.role}</span></p>
              <p className="mt-1 text-muted">Goal: {c.goal}</p>
              <p className="text-muted">Trait: {c.trait}</p>
              <p className="text-muted">Arc: {c.arc}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg">Chapters</h2>
          <button
            onClick={compile}
            disabled={compiling || draftedCount === 0}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
          >
            {compiling ? "Compiling…" : "Compile to manuscript"}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-md border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
            <p>{error}</p>
            {/credit|upgrade|plan/i.test(error) ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Link href="/dashboard/pricing" className="rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground">Upgrade plan</Link>
                <Link href="/dashboard/pricing#credit-packs" className="rounded-md border border-red-300/30 px-3 py-2 text-xs font-bold text-red-100">Add extra credits</Link>
              </div>
            ) : null}
          </div>
        )}

        <div className="mt-4 space-y-3">
          {initialChapters.map((c) => (
            <div key={c.id} className="rounded-lg border border-border bg-surface p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-foreground">
                    Chapter {c.chapter_number}: {c.title}
                  </p>
                  <p className="mt-1 text-sm text-muted">{c.summary}</p>
                </div>
                <span className="shrink-0 rounded-full bg-surface-2 px-3 py-1 text-xs uppercase tracking-wide text-accent">
                  {c.status}
                </span>
              </div>

              <textarea
                value={notes[c.chapter_number] || ""}
                onChange={(e) => setNotes((prev) => ({ ...prev, [c.chapter_number]: e.target.value }))}
                placeholder="Optional direction for this chapter (tone, a scene you want included, a line of dialogue to hit)…"
                rows={2}
                className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-xs outline-none focus:border-accent"
              />

              <div className="mt-3 flex gap-3">
                <button
                  onClick={() => generateChapter(c.chapter_number)}
                  disabled={busyChapter !== null}
                  className="rounded-md border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
                >
                  {busyChapter === c.chapter_number
                    ? "Writing…"
                    : c.status === "drafted"
                    ? "Regenerate chapter"
                    : "Write this chapter"}
                </button>
                {c.content && (
                  <button
                    onClick={() => setExpanded(expanded === c.chapter_number ? null : c.chapter_number)}
                    className="text-sm text-accent hover:underline"
                  >
                    {expanded === c.chapter_number ? "Hide draft" : "Read draft"}
                  </button>
                )}
                {c.word_count && <span className="self-center text-xs text-muted">{c.word_count.toLocaleString()} words</span>}
              </div>

              {expanded === c.chapter_number && c.content && (
                <div className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-background p-4 text-sm leading-relaxed">
                  {c.content}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
