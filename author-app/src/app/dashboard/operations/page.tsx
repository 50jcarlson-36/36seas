import { redirect } from "next/navigation";
import OperationsDashboard, {
  type Assignment,
  type CreditSummary,
  type EventItem,
  type Payment,
  type StaffProfile,
  type WorkItem,
} from "@/components/OperationsDashboard";
import IsbnPoolManager from "@/components/IsbnPoolManager";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { effectiveRole, effectiveTier, isOwnerEmail } from "@/lib/access";

type Metadata = { title?: string; wordCount?: number; expertService?: { service?: string } };

export default async function OperationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: actorRow } = await supabase
    .from("profiles")
    .select("id, email, full_name, role, subscription_tier")
    .eq("id", user.id)
    .single();
  const actorRole = effectiveRole(user.email, actorRow?.role);
  if (!["worker", "manager", "admin"].includes(actorRole)) redirect("/dashboard");

  const service = createServiceRoleClient();
  if (isOwnerEmail(user.email) && (actorRow?.role !== "admin" || actorRow?.subscription_tier !== "publisher")) {
    await service
      .from("profiles")
      .update({ role: "admin", subscription_tier: "publisher" })
      .eq("id", user.id);
  }

  const actor = {
    id: user.id,
    email: actorRow?.email || user.email || null,
    full_name: actorRow?.full_name || user.user_metadata?.full_name || null,
    role: actorRole,
    subscription_tier: effectiveTier(user.email, actorRow?.subscription_tier),
  } as StaffProfile;
  const canManage = actor.role === "manager" || actor.role === "admin";
  const isAdmin = actor.role === "admin";
  // Server-side request time is the correct anchor for the rolling usage window.
  // eslint-disable-next-line react-hooks/purity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [
    { data: profiles },
    { data: packages },
    { data: serviceOrders },
    { data: serviceRequests },
    { data: assignments },
    { data: creditRows },
    { data: events },
    { count: activeSubscriptions },
    { data: isbnRows },
  ] = await Promise.all([
    service.from("profiles").select("id, email, full_name, role, subscription_tier").order("created_at", { ascending: false }),
    service.from("submission_packages").select("id, user_id, status, review_status, payment_status, amount_total, currency, paid_at, refunded_at, stripe_payment_intent_id, created_at, metadata, manuscripts(title)").order("created_at", { ascending: false }).limit(200),
    service.from("service_orders").select("id, user_id, status, amount_total, currency, paid_at, refunded_at, stripe_payment_intent_id, created_at, metadata").order("created_at", { ascending: false }).limit(200),
    service.from("service_requests").select("id, user_id, status, genre, target_word_count, brief, created_at").order("created_at", { ascending: false }).limit(200),
    service.from("operations_assignments").select("*").order("created_at", { ascending: false }),
    service.from("credit_usage").select("user_id, type, amount, created_at").gte("created_at", thirtyDaysAgo),
    service.from("operations_events").select("id, actor_id, action, details, created_at").order("created_at", { ascending: false }).limit(50),
    service.from("subscriptions").select("id", { count: "exact", head: true }).in("status", ["active", "trialing"]),
    service.from("isbn_pool").select("format, status"),
  ]);

  const allProfiles = (profiles || []) as StaffProfile[];
  const profileById = new Map(allProfiles.map((profile) => [profile.id, profile]));
  const allAssignments = (assignments || []) as Assignment[];
  const assignmentByWork = new Map(allAssignments.map((item) => [`${item.work_type}:${item.work_id}`, item]));
  const staff = allProfiles.filter((profile) => ["worker", "manager", "admin"].includes(profile.role));

  const items: WorkItem[] = [];
  for (const pkg of packages || []) {
    const metadata = (pkg.metadata as Metadata | null) || {};
    const manuscript = Array.isArray(pkg.manuscripts) ? pkg.manuscripts[0] : pkg.manuscripts;
    items.push({
      workType: "submission_package",
      workId: pkg.id,
      title: metadata.title || manuscript?.title || "Untitled submission",
      authorEmail: profileById.get(pkg.user_id)?.email || "Unknown author",
      description: `KDP submission package · editorial status ${pkg.review_status.replaceAll("_", " ")}`,
      createdAt: pkg.created_at,
      sourceStatus: pkg.review_status,
      paymentStatus: pkg.payment_status,
      amountTotal: pkg.amount_total,
      currency: pkg.currency,
      assignment: assignmentByWork.get(`submission_package:${pkg.id}`) || null,
    });
  }
  for (const order of serviceOrders || []) {
    const metadata = (order.metadata as Metadata | null) || {};
    items.push({
      workType: "service_order",
      workId: order.id,
      title: metadata.title || "Human manuscript evaluation",
      authorEmail: profileById.get(order.user_id)?.email || "Unknown author",
      description: `${metadata.wordCount?.toLocaleString() || "Unknown"} words · paid human editorial evaluation`,
      createdAt: order.created_at,
      sourceStatus: order.status,
      paymentStatus: order.status,
      amountTotal: order.amount_total,
      currency: order.currency,
      assignment: assignmentByWork.get(`service_order:${order.id}`) || null,
    });
  }
  for (const request of serviceRequests || []) {
    items.push({
      workType: "service_request",
      workId: request.id,
      title: `${request.genre || "General"} managed writing request`,
      authorEmail: profileById.get(request.user_id)?.email || "Unknown author",
      description: `${request.target_word_count?.toLocaleString() || "Unknown"} target words · ${request.brief}`,
      createdAt: request.created_at,
      sourceStatus: request.status,
      assignment: assignmentByWork.get(`service_request:${request.id}`) || null,
    });
  }

  const visibleItems = canManage
    ? items
    : items.filter((item) => item.assignment?.assigned_to === user.id);

  const payments: Payment[] = canManage
    ? [
        ...(packages || []).filter((row) => row.amount_total != null).map((row) => {
          const metadata = (row.metadata as Metadata | null) || {};
          const manuscript = Array.isArray(row.manuscripts) ? row.manuscripts[0] : row.manuscripts;
          return {
            source: "submission_package" as const,
            id: row.id,
            title: metadata.title || manuscript?.title || "Untitled submission",
            authorEmail: profileById.get(row.user_id)?.email || "Unknown author",
            status: row.payment_status || "unknown",
            amountTotal: row.amount_total,
            currency: row.currency,
            paidAt: row.paid_at,
            refundedAt: row.refunded_at,
            refundable: Boolean(row.stripe_payment_intent_id && !String(row.payment_status).includes("refund")),
          };
        }),
        ...(serviceOrders || []).filter((row) => row.amount_total != null).map((row) => {
          const metadata = (row.metadata as Metadata | null) || {};
          return {
            source: "service_order" as const,
            id: row.id,
            title: metadata.title || "Human manuscript evaluation",
            authorEmail: profileById.get(row.user_id)?.email || "Unknown author",
            status: row.status,
            amountTotal: row.amount_total,
            currency: row.currency,
            paidAt: row.paid_at,
            refundedAt: row.refunded_at,
            refundable: Boolean(row.stripe_payment_intent_id && !String(row.status).includes("refund")),
          };
        }),
      ].sort((a, b) => new Date(b.paidAt || 0).getTime() - new Date(a.paidAt || 0).getTime())
    : [];

  const creditByUser = new Map<string, CreditSummary>();
  for (const row of creditRows || []) {
    if (!canManage && row.user_id !== user.id) continue;
    const profile = profileById.get(row.user_id);
    const summary = creditByUser.get(row.user_id) || {
      userId: row.user_id,
      email: profile?.email || "Unknown member",
      tier: profile?.subscription_tier || "free",
      review: 0,
      cover: 0,
      format: 0,
      submission: 0,
      story: 0,
      originality: 0,
      audio: 0,
      total: 0,
    };
    const type = row.type as keyof Pick<CreditSummary, "review" | "cover" | "format" | "submission" | "story" | "originality" | "audio">;
    if (type in summary) summary[type] += row.amount;
    summary.total += row.amount;
    creditByUser.set(row.user_id, summary);
  }

  const eventItems: EventItem[] = (events || [])
    .filter((event) => canManage || event.actor_id === user.id)
    .map((event) => ({
      id: event.id,
      action: event.action,
      created_at: event.created_at,
      actorEmail: profileById.get(event.actor_id)?.email || "System",
      details: event.details as Record<string, unknown> | null,
    }));

  const isbnCounts: Record<string, { available: number; assigned: number }> = {
    paperback: { available: 0, assigned: 0 },
    hardcover: { available: 0, assigned: 0 },
    ebook: { available: 0, assigned: 0 },
  };
  for (const row of isbnRows || []) {
    isbnCounts[row.format] ||= { available: 0, assigned: 0 };
    if (row.status === "available") isbnCounts[row.format].available += 1;
    else isbnCounts[row.format].assigned += 1;
  }

  return (
    <div className="space-y-12">
      <OperationsDashboard
        actor={actor}
        staff={staff}
        members={isAdmin ? allProfiles : staff}
        workItems={visibleItems}
        payments={payments}
        credits={[...creditByUser.values()].sort((a, b) => b.total - a.total)}
        events={eventItems}
        activeSubscriptions={activeSubscriptions || 0}
        canManage={canManage}
        isAdmin={isAdmin}
      />
      {isAdmin && (
        <section className="border-t border-border pt-10">
          <IsbnPoolManager counts={isbnCounts} />
        </section>
      )}
    </div>
  );
}
