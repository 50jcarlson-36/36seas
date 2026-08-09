"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = {
  id: string;
  user_id: string | null;
  invited_email: string | null;
  role: string;
  status: string;
};

type Workspace = {
  id: string;
  name: string;
  owner_id: string;
  members: Member[];
};

export default function TeamManager({
  workspaces,
  currentUserId,
  canCreate,
}: {
  workspaces: Workspace[];
  currentUserId: string;
  canCreate: boolean;
}) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState<Record<string, string>>({});
  const [note, setNote] = useState<string | null>(null);
  const router = useRouter();

  async function createWorkspace() {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/team/create", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(json.error || "Could not create workspace");
      return;
    }
    setName("");
    router.refresh();
  }

  async function invite(workspaceId: string) {
    const email = inviteEmail[workspaceId];
    if (!email) return;
    setError(null);
    setNote(null);
    const res = await fetch("/api/team/invite", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId, email }),
    });
    const json = await res.json();
    if (!res.ok) {
      setError(json.error || "Could not invite");
      return;
    }
    setNote(json.note);
    setInviteEmail((prev) => ({ ...prev, [workspaceId]: "" }));
    router.refresh();
  }

  async function removeMember(memberId: string) {
    await fetch("/api/team/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {canCreate && (
        <div className="rounded-lg border border-border bg-surface p-6">
          <h2 className="font-display text-lg">Create a workspace</h2>
          <p className="mt-1 text-sm text-muted">
            Publisher plan includes shared team workspaces — manuscripts, reviews, and covers
            created under a workspace are visible to every active member.
          </p>
          <div className="mt-4 flex gap-3">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 36Seas Fiction Team"
              className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
            />
            <button
              onClick={createWorkspace}
              disabled={loading || !name}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Creating…" : "Create"}
            </button>
          </div>
          {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        </div>
      )}

      {!canCreate && (
        <div className="rounded-lg border border-border bg-surface p-6 text-sm text-muted">
          Creating a workspace requires the Publisher plan. You can still be invited into a
          teammate&apos;s workspace on any plan.
        </div>
      )}

      {note && (
        <div className="rounded-md border border-accent/40 bg-surface-2 px-4 py-3 text-sm text-accent">
          {note}
        </div>
      )}

      {workspaces.map((ws) => (
        <div key={ws.id} className="rounded-lg border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg">{ws.name}</h3>
            {ws.owner_id === currentUserId && (
              <span className="text-xs uppercase tracking-wide text-accent">You own this</span>
            )}
          </div>

          <div className="mt-4 divide-y divide-border">
            {ws.members.map((m) => (
              <div key={m.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <p>{m.invited_email || m.user_id}</p>
                  <p className="text-xs text-muted">
                    {m.role} · {m.status}
                  </p>
                </div>
                {ws.owner_id === currentUserId && m.role !== "owner" && (
                  <button
                    onClick={() => removeMember(m.id)}
                    className="text-xs text-muted hover:text-red-400"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>

          {ws.owner_id === currentUserId && (
            <div className="mt-4 flex gap-3">
              <input
                type="email"
                value={inviteEmail[ws.id] || ""}
                onChange={(e) => setInviteEmail((prev) => ({ ...prev, [ws.id]: e.target.value }))}
                placeholder="teammate@email.com"
                className="w-full max-w-sm rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-accent"
              />
              <button
                onClick={() => invite(ws.id)}
                className="rounded-md border border-border px-4 py-2 text-sm hover:border-accent"
              >
                Invite
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
