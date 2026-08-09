"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function IsbnPoolManager({
  counts,
}: {
  counts: Record<string, { available: number; assigned: number }>;
}) {
  const [format, setFormat] = useState("paperback");
  const [bulk, setBulk] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const router = useRouter();

  async function submit() {
    setError(null);
    setAdded(null);
    const isbns = bulk.split(/[\s,]+/).filter(Boolean);
    const res = await fetch("/api/admin/isbn/add", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isbns, format }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not add ISBNs");
      return;
    }
    setAdded(json.added);
    setBulk("");
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-6">
      <h2 className="font-display text-lg">ISBN pool</h2>
      <p className="mt-1 text-sm text-muted">
        Paste ISBN-13s purchased from Bowker (or your registrar) here. They auto-assign, one per
        manuscript, when a submission package requests one.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-3">
        {(["paperback", "hardcover", "ebook"] as const).map((f) => (
          <div key={f} className="rounded-md border border-border p-3 text-center">
            <p className="text-xs uppercase tracking-wide text-muted">{f}</p>
            <p className="font-display mt-1 text-xl">{counts[f]?.available ?? 0}</p>
            <p className="text-xs text-muted">available · {counts[f]?.assigned ?? 0} used</p>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-3">
        <select
          value={format}
          onChange={(e) => setFormat(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
        >
          <option value="paperback">Paperback</option>
          <option value="hardcover">Hardcover</option>
          <option value="ebook">eBook</option>
        </select>
      </div>
      <textarea
        value={bulk}
        onChange={(e) => setBulk(e.target.value)}
        placeholder={"One ISBN-13 per line, e.g.\n9781234567897\n9781234567903"}
        rows={4}
        className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
      />
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
      {added !== null && <p className="mt-2 text-sm text-accent">Added {added} ISBNs.</p>}
      <button
        onClick={submit}
        disabled={!bulk.trim()}
        className="mt-3 rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
      >
        Add to pool
      </button>
    </div>
  );
}
