import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOperationsActor, recordOperationsEvent } from "@/lib/operations";
import { sendSubmissionReviewEmail } from "@/lib/email";

const reviewSchema = z.object({
  packageId: z.string().uuid(),
  reviewStatus: z.enum(["approved", "changes_requested"]),
  notes: z.string().trim().max(5000).optional().default(""),
});

export async function POST(req: NextRequest) {
  const actor = await getOperationsActor();
  if (!actor?.canManage) return NextResponse.json({ error: "Manager access required" }, { status: 403 });

  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid review." }, { status: 400 });
  }
  const { packageId, reviewStatus, notes } = parsed.data;

  const serviceRole = actor.service;
  const { data: pkg, error } = await serviceRole
    .from("submission_packages")
    .update({
      review_status: reviewStatus,
      review_notes: notes || null,
      reviewed_by: actor.user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", packageId)
    .select("user_id, metadata")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordOperationsEvent({
    actorId: actor.user.id,
    workType: "submission_package",
    workId: packageId,
    action: `submission.${reviewStatus}`,
    details: { notesProvided: Boolean(notes) },
  });

  let emailSent = false;
  if (pkg && (reviewStatus === "approved" || reviewStatus === "changes_requested")) {
    const { data: authorProfile } = await serviceRole
      .from("profiles")
      .select("email")
      .eq("id", pkg.user_id)
      .single();
    if (authorProfile?.email) {
      const title = (pkg.metadata as { title?: string } | null)?.title || "your manuscript";
      const result = await sendSubmissionReviewEmail({
        to: authorProfile.email,
        manuscriptTitle: title,
        reviewStatus,
        notes: notes || undefined,
      });
      emailSent = result.sent;
    }
  }

  return NextResponse.json({ ok: true, emailSent });
}
