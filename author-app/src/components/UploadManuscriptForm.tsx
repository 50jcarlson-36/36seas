"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const GENRES = [
  "Literary fiction",
  "Speculative fiction",
  "Thriller",
  "Romance",
  "Fantasy",
  "Sci-fi",
  "Horror",
  "Nonfiction",
  "Memoir",
  "Business",
  "Other",
];

export default function UploadManuscriptForm() {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [genre, setGenre] = useState(GENRES[0]);
  const [synopsis, setSynopsis] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Choose a .docx or .txt file to upload.");
      return;
    }
    setLoading(true);
    setError(null);

    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("subtitle", subtitle);
    form.append("genre", genre);
    form.append("synopsis", synopsis);

    const res = await fetch("/api/manuscripts/upload", { method: "POST", body: form });
    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(json.error || "Upload failed");
      return;
    }

    router.push(`/dashboard/manuscripts/${json.manuscript.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-border bg-surface p-6">
      <h2 className="font-display text-xl">Upload a manuscript</h2>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="text-sm text-muted">Title</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
        <div>
          <label className="text-sm text-muted">Subtitle (optional)</label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />
        </div>
      </div>

      <div>
        <label className="text-sm text-muted">Genre</label>
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {GENRES.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-sm text-muted">One-paragraph synopsis (optional)</label>
        <textarea
          value={synopsis}
          onChange={(e) => setSynopsis(e.target.value)}
          rows={3}
          className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        />
      </div>

      <div>
        <label className="text-sm text-muted">Manuscript file (.docx or .txt)</label>
        <input
          type="file"
          required
          accept=".docx,.txt,.md"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="mt-1 w-full text-sm text-muted file:mr-4 file:rounded-md file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:text-foreground"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Uploading…" : "Upload manuscript"}
      </button>
    </form>
  );
}
