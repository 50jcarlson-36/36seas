"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Pkg = {
  id: string;
  manuscript_id: string;
  review_status: string;
  review_notes: string | null;
  created_at: string;
  metadata: {
    title?: string;
    expertService?: { paymentStatus?: string; paidAt?: string; service?: string };
  };
  manuscripts?: { title: string } | null;
};

export default function AdminReviewPanel({ packages }: { packages: Pkg[] }) {
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const router = useRouter();

  async function review(packageId: string, reviewStatus: string) {
    setBusy(packageId);
    await fetch("/api/admin/submissions/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packageId, reviewStatus, notes: notes[packageId] }),
    });
    setBusy(null);
    router.refresh();
  }

  if (packages.length === 0) {
    return <p className="text-sm text-muted">No submission packages waiting on review.</p>;
  }

  return (
    <div className="space-y-4">
      {packages.map((p) => (
        <div key={p.id} className="rounded-lg border border-border bg-surface p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">{p.metadata?.title || p.manuscripts?.title || "Untitled"}</h3>
            <div className="flex items-center gap-2">
              {p.metadata?.expertService?.paymentStatus === "paid" && (
                <span className="rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">
                  Paid expert service
                </span>
              )}
              <span className="rounded-full bg-surface-2 px-3 py-1 text-xs uppercase tracking-wide text-accent">
                {p.review_status.replace("_", " ")}
              </span>
            </div>
          </div>
          <p className="mt-1 text-xs text-muted">Packaged {new Date(p.created_at).toLocaleString()}</p>

          <textarea
            value={notes[p.id] ?? p.review_notes ?? ""}
            onChange={(e) => setNotes((prev) => ({ ...prev, [p.id]: e.target.value }))}
            placeholder="Notes for the author (visible on changes requested)"
            rows={2}
            className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
          />

          <div className="mt-3 flex gap-3">
            <button
              onClick={() => review(p.id, "approved")}
              disabled={busy === p.id}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => review(p.id, "changes_requested")}
              disabled={busy === p.id}
              className="rounded-md border border-border px-4 py-2 text-sm hover:border-accent disabled:opacity-50"
            >
              Request changes
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
