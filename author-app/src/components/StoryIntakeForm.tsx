"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const GENRES = ["Fantasy", "Mystery", "Romance", "Sci-fi", "Thriller", "Literary fiction", "Horror", "Other"];

export default function StoryIntakeForm() {
  const [genre, setGenre] = useState(GENRES[0]);
  const [premise, setPremise] = useState("");
  const [mainCharacterName, setMainCharacterName] = useState("");
  const [mainCharacterGoal, setMainCharacterGoal] = useState("");
  const [mainCharacterTrait, setMainCharacterTrait] = useState("");
  const [setting, setSetting] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/story/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ genre, premise, mainCharacterName, mainCharacterGoal, mainCharacterTrait, setting }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Could not build outline");
      return;
    }
    router.push(`/dashboard/story/${json.project.id}`);
    router.refresh();
  }

  return (
    <form id="new-story" onSubmit={handleSubmit} className="scroll-mt-8 space-y-4 rounded-lg border border-border bg-surface p-6">
      <h2 className="font-display text-xl">Start a new story</h2>
      <p className="text-sm text-muted">
        No manuscript yet? Give me the basics and I&apos;ll build a chapter-by-chapter outline and
        character profiles — then we write it together, chapter by chapter.
      </p>

      <div>
        <label className="text-sm text-muted">Genre</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {GENRES.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-muted">Premise — what&apos;s the main plot or hook?</label>
        <textarea
          required
          value={premise}
          onChange={(e) => setPremise(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="text-sm text-muted">Main character name</label>
          <input
            value={mainCharacterName}
            onChange={(e) => setMainCharacterName(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-sm text-muted">Their goal</label>
          <input
            value={mainCharacterGoal}
            onChange={(e) => setMainCharacterGoal(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-sm text-muted">Key personality trait</label>
          <input
            value={mainCharacterTrait}
            onChange={(e) => setMainCharacterTrait(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted">Setting — where and when does it take place?</label>
        <input
          value={setting}
          onChange={(e) => setSetting(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      {error && (
        <div className="rounded-md border border-red-900/50 bg-red-950/40 px-4 py-3 text-sm text-red-300">
          <p>{error}</p>
          {/credit|upgrade|plan/i.test(error) ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <Link href="/dashboard/pricing" className="rounded-md bg-accent px-3 py-2 text-xs font-bold text-accent-foreground">Upgrade plan</Link>
              <Link href="/dashboard/pricing#credit-packs" className="rounded-md border border-red-300/30 px-3 py-2 text-xs font-bold text-red-100">Add extra credits</Link>
            </div>
          ) : null}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Building outline…" : "Build outline"}
      </button>
    </form>
  );
}
