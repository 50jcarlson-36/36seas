import "server-only";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { effectiveRole } from "@/lib/access";

export type StaffRole = "worker" | "manager" | "admin";

export async function getOperationsActor() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();
  const role = effectiveRole(user.email, profile?.role);
  if (!["worker", "manager", "admin"].includes(role)) return null;

  return {
    user,
    profile: {
      id: user.id,
      email: profile?.email || user.email || null,
      full_name: profile?.full_name || user.user_metadata?.full_name || null,
      role: role as StaffRole,
    },
    service: createServiceRoleClient(),
    canManage: role === "manager" || role === "admin",
    isAdmin: role === "admin",
  };
}

export async function recordOperationsEvent(input: {
  actorId: string;
  workType?: string;
  workId?: string;
  action: string;
  details?: Record<string, unknown>;
}) {
  const service = createServiceRoleClient();
  await service.from("operations_events").insert({
    actor_id: input.actorId,
    work_type: input.workType || null,
    work_id: input.workId || null,
    action: input.action,
    details: input.details || {},
  });
}
