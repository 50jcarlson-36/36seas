import { NextRequest, NextResponse } from "next/server";
import { originalityWebhookAuthorized } from "@/lib/copyleaks";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest, context: { params: Promise<{ checkId: string }> }) {
  const { checkId } = await context.params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!originalityWebhookAuthorized(req, body)) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });

  const tasks = Array.isArray(body.tasks) ? body.tasks as Array<Record<string, unknown>> : [];
  const healthy = body.completed === true && tasks.every((task) => task.isHealthy === true && Number(task.httpStatusCode) >= 200 && Number(task.httpStatusCode) < 300);
  const admin = createServiceRoleClient();
  const { data: check } = await admin.from("originality_checks")
    .select("similarity_percent").eq("id", checkId).maybeSingle();
  if (!check) return NextResponse.json({ error: "Originality check not found" }, { status: 404 });

  if (!healthy) {
    await admin.from("originality_checks").update({ status: "failed", error: "Detailed originality results could not be delivered." }).eq("id", checkId);
    return NextResponse.json({ received: true });
  }
  const threshold = Number(process.env.ORIGINALITY_PASS_THRESHOLD || 15);
  const similarity = Number(check.similarity_percent || 0);
  await admin.from("originality_checks").update({
    status: similarity <= threshold ? "passed" : "flagged",
    error: null,
  }).eq("id", checkId);
  return NextResponse.json({ received: true });
}
