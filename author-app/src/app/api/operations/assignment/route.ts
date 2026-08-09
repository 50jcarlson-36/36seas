import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getOperationsActor, recordOperationsEvent } from "@/lib/operations";

const WorkType = z.enum(["submission_package", "service_order", "service_request"]);
const AssignmentStatus = z.enum([
  "unassigned",
  "queued",
  "in_progress",
  "blocked",
  "quality_review",
  "completed",
  "cancelled",
]);
const Priority = z.enum(["low", "normal", "high", "urgent"]);

const Input = z.object({
  workType: WorkType,
  workId: z.string().uuid(),
  assignedTo: z.string().uuid().nullable().optional(),
  status: AssignmentStatus.optional(),
  priority: Priority.optional(),
  dueAt: z.string().datetime().nullable().optional(),
  internalNotes: z.string().max(4000).nullable().optional(),
});

async function resolveWork(
  service: SupabaseClient,
  workType: z.infer<typeof WorkType>,
  workId: string
) {
  if (workType === "submission_package") {
    const { data } = await service
      .from("submission_packages")
      .select("id, user_id, metadata, manuscripts(title)")
      .eq("id", workId)
      .single();
    if (!data) return null;
    const metadata = (data.metadata as { title?: string } | null) || {};
    const manuscript = Array.isArray(data.manuscripts) ? data.manuscripts[0] : data.manuscripts;
    return { authorId: data.user_id, title: metadata.title || manuscript?.title || "Untitled submission" };
  }

  if (workType === "service_order") {
    const { data } = await service
      .from("service_orders")
      .select("id, user_id, metadata")
      .eq("id", workId)
      .single();
    if (!data) return null;
    const metadata = (data.metadata as { title?: string } | null) || {};
    return { authorId: data.user_id, title: metadata.title || "Human manuscript evaluation" };
  }

  const { data } = await service
    .from("service_requests")
    .select("id, user_id, genre")
    .eq("id", workId)
    .single();
  return data
    ? { authorId: data.user_id, title: `${data.genre || "General"} managed writing request` }
    : null;
}

export async function POST(req: NextRequest) {
  const actor = await getOperationsActor();
  if (!actor) return NextResponse.json({ error: "Staff access required." }, { status: 403 });

  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid assignment details." }, { status: 400 });

  const input = parsed.data;
  const { data: existing } = await actor.service
    .from("operations_assignments")
    .select("*")
    .eq("work_type", input.workType)
    .eq("work_id", input.workId)
    .maybeSingle();

  if (!actor.canManage) {
    if (!existing || existing.assigned_to !== actor.user.id) {
      return NextResponse.json({ error: "This item is not assigned to you." }, { status: 403 });
    }
    const { data, error } = await actor.service
      .from("operations_assignments")
      .update({
        status: input.status || existing.status,
        internal_notes: input.internalNotes === undefined ? existing.internal_notes : input.internalNotes,
      })
      .eq("id", existing.id)
      .eq("assigned_to", actor.user.id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await recordOperationsEvent({
      actorId: actor.user.id,
      workType: input.workType,
      workId: input.workId,
      action: "assignment.updated",
      details: { status: data.status },
    });
    return NextResponse.json({ assignment: data });
  }

  const work = await resolveWork(actor.service, input.workType, input.workId);
  if (!work) return NextResponse.json({ error: "Work item not found." }, { status: 404 });

  if (input.assignedTo) {
    const { data: assignee } = await actor.service
      .from("profiles")
      .select("id, role")
      .eq("id", input.assignedTo)
      .in("role", ["worker", "manager", "admin"])
      .maybeSingle();
    if (!assignee) return NextResponse.json({ error: "Assignee is not an active staff member." }, { status: 400 });
  }

  const status = input.status || (input.assignedTo ? "queued" : "unassigned");
  const { data, error } = await actor.service
    .from("operations_assignments")
    .upsert(
      {
        work_type: input.workType,
        work_id: input.workId,
        title: work.title,
        author_id: work.authorId,
        assigned_to: input.assignedTo === undefined ? existing?.assigned_to || null : input.assignedTo,
        assigned_by: actor.user.id,
        status,
        priority: input.priority || existing?.priority || "normal",
        due_at: input.dueAt === undefined ? existing?.due_at || null : input.dueAt,
        internal_notes:
          input.internalNotes === undefined ? existing?.internal_notes || null : input.internalNotes,
      },
      { onConflict: "work_type,work_id" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  await recordOperationsEvent({
    actorId: actor.user.id,
    workType: input.workType,
    workId: input.workId,
    action: existing ? "assignment.updated" : "assignment.created",
    details: { assignedTo: data.assigned_to, status: data.status, priority: data.priority },
  });
  return NextResponse.json({ assignment: data });
}
