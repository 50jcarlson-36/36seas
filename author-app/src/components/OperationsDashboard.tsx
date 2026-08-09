"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  BadgeDollarSign,
  Bot,
  Clock3,
  Gauge,
  RefreshCcw,
  ShieldCheck,
} from "lucide-react";

export type StaffProfile = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: "member" | "worker" | "manager" | "admin";
  subscription_tier: string;
};

export type Assignment = {
  id: string;
  work_type: "submission_package" | "service_order" | "service_request";
  work_id: string;
  assigned_to: string | null;
  status: string;
  priority: string;
  due_at: string | null;
  internal_notes: string | null;
};

export type WorkItem = {
  workType: Assignment["work_type"];
  workId: string;
  title: string;
  authorEmail: string;
  description: string;
  createdAt: string;
  sourceStatus: string;
  paymentStatus?: string | null;
  amountTotal?: number | null;
  currency?: string | null;
  assignment: Assignment | null;
};

export type Payment = {
  source: "submission_package" | "service_order";
  id: string;
  title: string;
  authorEmail: string;
  status: string;
  amountTotal: number | null;
  currency: string | null;
  paidAt: string | null;
  refundedAt: string | null;
  refundable: boolean;
};

export type CreditSummary = {
  userId: string;
  email: string;
  tier: string;
  review: number;
  cover: number;
  format: number;
  submission: number;
  story: number;
  originality: number;
  audio: number;
  total: number;
};

export type EventItem = {
  id: string;
  action: string;
  created_at: string;
  actorEmail: string;
  details: Record<string, unknown> | null;
};

type Props = {
  actor: StaffProfile;
  staff: StaffProfile[];
  members: StaffProfile[];
  workItems: WorkItem[];
  payments: Payment[];
  credits: CreditSummary[];
  events: EventItem[];
  activeSubscriptions: number;
  canManage: boolean;
  isAdmin: boolean;
};

const tabs = ["Overview", "Work queue", "Payments", "AI credits", "Staff"] as const;
type Tab = (typeof tabs)[number];

const money = (amount: number | null, currency = "usd") =>
  amount == null
    ? "—"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "usd" }).format(amount / 100);

function statusTone(status: string) {
  if (["complete", "completed", "approved", "paid", "active"].includes(status)) return "text-emerald-300 bg-emerald-400/10";
  if (["blocked", "failed", "refunded", "cancelled", "changes_requested"].includes(status)) return "text-red-300 bg-red-400/10";
  if (["in_progress", "quality_review", "pending"].includes(status)) return "text-amber-200 bg-amber-400/10";
  return "text-accent bg-accent/10";
}

function Pill({ value }: { value: string }) {
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] ${statusTone(value)}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

export default function OperationsDashboard(props: Props) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const router = useRouter();

  const openWork = props.workItems.filter((item) => !["completed", "cancelled"].includes(item.assignment?.status || "unassigned"));
  const grossRevenue = props.payments.reduce((sum, payment) => sum + (payment.amountTotal || 0), 0);
  const refunded = props.payments
    .filter((payment) => payment.status.includes("refund"))
    .reduce((sum, payment) => sum + (payment.amountTotal || 0), 0);
  const creditsUsed = props.credits.reduce((sum, row) => sum + row.total, 0);

  async function saveAssignment(item: WorkItem, form: HTMLFormElement) {
    setBusy(item.workId);
    setMessage(null);
    const data = new FormData(form);
    const dueDate = String(data.get("dueAt") || "");
    const response = await fetch("/api/operations/assignment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        workType: item.workType,
        workId: item.workId,
        assignedTo: props.canManage ? String(data.get("assignedTo") || "") || null : undefined,
        status: String(data.get("status") || "queued"),
        priority: props.canManage ? String(data.get("priority") || "normal") : undefined,
        dueAt: props.canManage ? (dueDate ? new Date(`${dueDate}T17:00:00`).toISOString() : null) : undefined,
        internalNotes: String(data.get("internalNotes") || "") || null,
      }),
    });
    const json = await response.json();
    setBusy(null);
    if (!response.ok) {
      setMessage({ tone: "error", text: json.error || "Could not update the assignment." });
      return;
    }
    setMessage({ tone: "ok", text: "Work item updated." });
    router.refresh();
  }

  async function changeRole(profileId: string, role: StaffProfile["role"]) {
    setBusy(profileId);
    setMessage(null);
    const response = await fetch("/api/operations/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, role }),
    });
    const json = await response.json();
    setBusy(null);
    if (!response.ok) {
      setMessage({ tone: "error", text: json.error || "Could not update the staff role." });
      return;
    }
    setMessage({ tone: "ok", text: "Staff access updated." });
    router.refresh();
  }

  async function refund(payment: Payment) {
    if (!window.confirm(`Issue a full refund for ${payment.title}? This action is sent to Stripe immediately.`)) return;
    setBusy(payment.id);
    setMessage(null);
    const response = await fetch("/api/operations/refund", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source: payment.source, id: payment.id, reason: "requested_by_customer" }),
    });
    const json = await response.json();
    setBusy(null);
    if (!response.ok) {
      setMessage({ tone: "error", text: json.error || "Stripe could not issue this refund." });
      return;
    }
    setMessage({ tone: "ok", text: "Refund submitted to Stripe. The payment status will update from the webhook." });
    router.refresh();
  }

  async function reviewSubmission(item: WorkItem, form: HTMLFormElement, reviewStatus: "approved" | "changes_requested") {
    setBusy(`review-${item.workId}`);
    setMessage(null);
    const data = new FormData(form);
    const response = await fetch("/api/admin/submissions/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        packageId: item.workId,
        reviewStatus,
        notes: String(data.get("authorNotes") || ""),
      }),
    });
    const json = await response.json();
    setBusy(null);
    if (!response.ok) {
      setMessage({ tone: "error", text: json.error || "Could not save the editorial decision." });
      return;
    }
    setMessage({ tone: "ok", text: json.emailSent ? "Decision saved and the author was notified." : "Decision saved. Email delivery is not configured yet." });
    router.refresh();
  }

  const visibleTabs = tabs.filter((item) => {
    if (item === "Payments") return props.canManage;
    if (item === "Staff") return props.isAdmin;
    return true;
  });

  return (
    <div className="space-y-7">
      <header className="flex flex-col gap-5 border-b border-border pb-7 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-accent">36Seas operations</p>
          <h1 className="mt-3 font-display text-3xl">Publishing control room</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
            Manage every paid handoff from manuscript intake through expert review, production, and delivery.
          </p>
        </div>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-accent/10 text-accent"><ShieldCheck size={18} /></span>
          <div>
            <p className="text-xs font-semibold">{props.actor.full_name || props.actor.email}</p>
            <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{props.actor.role} access</p>
          </div>
        </div>
      </header>

      <div className="flex gap-1 overflow-x-auto rounded-lg border border-border bg-surface p-1.5">
        {visibleTabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm transition ${tab === item ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"}`}
          >
            {item}
          </button>
        ))}
      </div>

      {message && (
        <p className={`rounded-md border px-4 py-3 text-sm ${message.tone === "ok" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200" : "border-red-500/30 bg-red-500/10 text-red-200"}`}>
          {message.text}
        </p>
      )}

      {tab === "Overview" && (
        <div className="space-y-7">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <Metric icon={<Clock3 size={18} />} label="Open work" value={openWork.length.toLocaleString()} note={`${props.staff.length} staff available`} />
            <Metric icon={<BadgeDollarSign size={18} />} label="Gross payments" value={money(grossRevenue)} note={`${props.payments.length} transactions`} />
            <Metric icon={<RefreshCcw size={18} />} label="Refunded" value={money(refunded)} note="Recorded payment value" />
            <Metric icon={<Bot size={18} />} label="AI credits · 30d" value={creditsUsed.toLocaleString()} note={`${props.activeSubscriptions} active subscriptions`} />
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]">
            <section className="rounded-xl border border-border bg-surface">
              <div className="flex items-center justify-between border-b border-border px-5 py-4">
                <div><p className="font-display text-lg">Priority queue</p><p className="text-xs text-muted">Work that needs attention next</p></div>
                <button onClick={() => setTab("Work queue")} className="text-xs font-semibold uppercase tracking-wide text-accent">Open queue →</button>
              </div>
              <div className="divide-y divide-border">
                {openWork.slice(0, 6).map((item) => (
                  <div key={`${item.workType}-${item.workId}`} className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <p className="font-medium">{item.title}</p>
                      <p className="mt-1 text-xs text-muted">{item.description} · {item.authorEmail}</p>
                    </div>
                    <div className="flex items-center gap-2"><Pill value={item.assignment?.priority || "normal"} /><Pill value={item.assignment?.status || "unassigned"} /></div>
                  </div>
                ))}
                {openWork.length === 0 && <p className="px-5 py-8 text-sm text-muted">The operations queue is clear.</p>}
              </div>
            </section>

            <section className="rounded-xl border border-border bg-surface">
              <div className="border-b border-border px-5 py-4"><p className="font-display text-lg">Recent activity</p><p className="text-xs text-muted">Operational audit trail</p></div>
              <div className="divide-y divide-border">
                {props.events.slice(0, 8).map((event) => (
                  <div key={event.id} className="px-5 py-3.5">
                    <p className="text-sm">{event.action.replaceAll(".", " · ").replaceAll("_", " ")}</p>
                    <p className="mt-1 text-[11px] text-muted">{event.actorEmail} · {new Date(event.created_at).toLocaleString()}</p>
                  </div>
                ))}
                {props.events.length === 0 && <p className="px-5 py-8 text-sm text-muted">Activity will appear as the team works.</p>}
              </div>
            </section>
          </div>
        </div>
      )}

      {tab === "Work queue" && (
        <section className="space-y-4">
          <div className="flex items-end justify-between gap-4">
            <div><h2 className="font-display text-2xl">Work queue</h2><p className="mt-1 text-sm text-muted">Assign, prioritize, and move production work to completion.</p></div>
            <Pill value={`${openWork.length} open`} />
          </div>
          {props.workItems.map((item) => (
            <form
              key={`${item.workType}-${item.workId}`}
              onSubmit={(event) => { event.preventDefault(); void saveAssignment(item, event.currentTarget); }}
              className="rounded-xl border border-border bg-surface p-5"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-xl">{item.title}</h3><Pill value={item.workType} /></div>
                  <p className="mt-1 text-xs text-muted">{item.authorEmail} · received {new Date(item.createdAt).toLocaleString()}</p>
                  <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">{item.description}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2"><Pill value={item.paymentStatus || item.sourceStatus} />{item.amountTotal != null && <strong className="text-sm text-accent">{money(item.amountTotal, item.currency || "usd")}</strong>}</div>
              </div>

              <div className={`mt-5 grid gap-4 ${props.canManage ? "md:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-2"}`}>
                {props.canManage && (
                  <label className="text-xs text-muted">Assigned to
                    <select name="assignedTo" defaultValue={item.assignment?.assigned_to || ""} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                      <option value="">Unassigned</option>
                      {props.staff.map((person) => <option key={person.id} value={person.id}>{person.full_name || person.email} · {person.role}</option>)}
                    </select>
                  </label>
                )}
                <label className="text-xs text-muted">Status
                  <select name="status" defaultValue={item.assignment?.status || "unassigned"} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                    {['unassigned','queued','in_progress','blocked','quality_review','completed','cancelled'].map((value) => <option key={value} value={value}>{value.replaceAll('_',' ')}</option>)}
                  </select>
                </label>
                {props.canManage && (
                  <>
                    <label className="text-xs text-muted">Priority
                      <select name="priority" defaultValue={item.assignment?.priority || "normal"} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm text-foreground">
                        {['low','normal','high','urgent'].map((value) => <option key={value}>{value}</option>)}
                      </select>
                    </label>
                    <label className="text-xs text-muted">Due date
                      <input name="dueAt" type="date" defaultValue={item.assignment?.due_at?.slice(0,10) || ""} className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground" />
                    </label>
                  </>
                )}
              </div>
              <label className="mt-4 block text-xs text-muted">Private staff notes
                <textarea name="internalNotes" rows={2} defaultValue={item.assignment?.internal_notes || ""} placeholder="Handoff notes, review findings, or blockers…" className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent" />
              </label>
              {props.canManage && item.workType === "submission_package" && (
                <label className="mt-4 block text-xs text-muted">Editorial decision notes for the author
                  <textarea name="authorNotes" rows={2} placeholder="Explain requested changes or add a short approval note…" className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-accent" />
                </label>
              )}
              <div className="mt-4 flex flex-wrap gap-2">
                <button disabled={busy === item.workId} className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground disabled:opacity-50">
                  {busy === item.workId ? "Saving…" : item.assignment ? "Update work item" : "Create assignment"}
                </button>
                {props.canManage && item.workType === "submission_package" && (
                  <>
                    <button type="button" onClick={(event) => void reviewSubmission(item, event.currentTarget.form!, "approved")} disabled={busy === `review-${item.workId}`} className="rounded-md border border-emerald-400/30 px-4 py-2.5 text-sm font-semibold text-emerald-200 hover:bg-emerald-400/10 disabled:opacity-50">Approve package</button>
                    <button type="button" onClick={(event) => void reviewSubmission(item, event.currentTarget.form!, "changes_requested")} disabled={busy === `review-${item.workId}`} className="rounded-md border border-amber-400/30 px-4 py-2.5 text-sm font-semibold text-amber-100 hover:bg-amber-400/10 disabled:opacity-50">Request changes</button>
                  </>
                )}
              </div>
            </form>
          ))}
          {props.workItems.length === 0 && <p className="rounded-xl border border-border bg-surface px-5 py-10 text-sm text-muted">No work items are available for this view.</p>}
        </section>
      )}

      {tab === "Payments" && props.canManage && (
        <section className="space-y-4">
          <div><h2 className="font-display text-2xl">Payments and refunds</h2><p className="mt-1 text-sm text-muted">Reconcile paid services and send controlled refunds through Stripe.</p></div>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-[10px] uppercase tracking-[0.16em] text-muted"><tr><th className="px-4 py-3">Customer / item</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Paid</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Action</th></tr></thead>
              <tbody className="divide-y divide-border">
                {props.payments.map((payment) => (
                  <tr key={`${payment.source}-${payment.id}`}>
                    <td className="px-4 py-4"><p className="font-medium">{payment.title}</p><p className="mt-1 text-xs text-muted">{payment.authorEmail}</p></td>
                    <td className="px-4 py-4 text-muted">{payment.source.replaceAll('_',' ')}</td>
                    <td className="px-4 py-4 text-muted">{payment.paidAt ? new Date(payment.paidAt).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-4 font-semibold">{money(payment.amountTotal, payment.currency || "usd")}</td>
                    <td className="px-4 py-4"><Pill value={payment.status} /></td>
                    <td className="px-4 py-4 text-right">
                      {payment.refundable ? <button onClick={() => void refund(payment)} disabled={busy === payment.id} className="rounded-md border border-red-400/30 px-3 py-2 text-xs font-semibold text-red-200 hover:bg-red-400/10 disabled:opacity-50">{busy === payment.id ? "Sending…" : "Refund"}</button> : <span className="text-xs text-muted">Not refundable</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {props.payments.length === 0 && <p className="px-5 py-10 text-sm text-muted">No completed payments yet.</p>}
          </div>
        </section>
      )}

      {tab === "AI credits" && (
        <section className="space-y-5">
          <div><h2 className="font-display text-2xl">AI credit monitor</h2><p className="mt-1 text-sm text-muted">Last 30 days of member usage across editing, covers, formatting, submissions, and story generation.</p></div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {(["review", "cover", "format", "submission", "story", "originality", "audio"] as const).map((type) => (
              <Metric key={type} icon={<Gauge size={17} />} label={type} value={props.credits.reduce((sum, row) => sum + row[type], 0).toLocaleString()} note="credits consumed" />
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-[10px] uppercase tracking-[0.16em] text-muted"><tr><th className="px-4 py-3">Member</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Reviews</th><th className="px-4 py-3">Covers</th><th className="px-4 py-3">Formatting</th><th className="px-4 py-3">Packages</th><th className="px-4 py-3">Story</th><th className="px-4 py-3">Originality</th><th className="px-4 py-3">Audio</th><th className="px-4 py-3">Total</th></tr></thead>
              <tbody className="divide-y divide-border">{props.credits.map((row) => <tr key={row.userId}><td className="px-4 py-4">{row.email}</td><td className="px-4 py-4"><Pill value={row.tier} /></td><td className="px-4 py-4">{row.review}</td><td className="px-4 py-4">{row.cover}</td><td className="px-4 py-4">{row.format}</td><td className="px-4 py-4">{row.submission}</td><td className="px-4 py-4">{row.story}</td><td className="px-4 py-4">{row.originality}</td><td className="px-4 py-4">{row.audio}</td><td className="px-4 py-4 font-semibold text-accent">{row.total}</td></tr>)}</tbody>
            </table>
            {props.credits.length === 0 && <p className="px-5 py-10 text-sm text-muted">No AI credits have been used in the last 30 days.</p>}
          </div>
        </section>
      )}

      {tab === "Staff" && props.isAdmin && (
        <section className="space-y-5">
          <div><h2 className="font-display text-2xl">Staff access</h2><p className="mt-1 text-sm text-muted">Workers handle assigned jobs. Managers can assign work and issue refunds. Administrators control staff permissions.</p></div>
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-sm text-amber-100">
            To add an offshore worker, have them create a normal account first, then change that account from member to worker here.
          </div>
          <div className="overflow-x-auto rounded-xl border border-border bg-surface">
            <table className="w-full min-w-[700px] text-left text-sm">
              <thead className="border-b border-border bg-surface-2 text-[10px] uppercase tracking-[0.16em] text-muted"><tr><th className="px-4 py-3">Person</th><th className="px-4 py-3">Plan</th><th className="px-4 py-3">Access</th><th className="px-4 py-3">Current work</th></tr></thead>
              <tbody className="divide-y divide-border">
                {props.members.map((person) => (
                  <tr key={person.id}>
                    <td className="px-4 py-4"><p className="font-medium">{person.full_name || "Name not provided"}</p><p className="mt-1 text-xs text-muted">{person.email}</p></td>
                    <td className="px-4 py-4"><Pill value={person.subscription_tier} /></td>
                    <td className="px-4 py-4"><select value={person.role} disabled={busy === person.id} onChange={(event) => void changeRole(person.id, event.target.value as StaffProfile["role"])} className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground disabled:opacity-50">{['member','worker','manager','admin'].map((role) => <option key={role}>{role}</option>)}</select></td>
                    <td className="px-4 py-4 text-muted">{props.workItems.filter((item) => item.assignment?.assigned_to === person.id && !['completed','cancelled'].includes(item.assignment.status)).length} open</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Metric({ icon, label, value, note }: { icon: React.ReactNode; label: string; value: string; note: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between text-accent"><span className="text-[10px] font-semibold uppercase tracking-[0.18em]">{label}</span>{icon}</div>
      <p className="mt-5 font-display text-3xl">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </div>
  );
}
