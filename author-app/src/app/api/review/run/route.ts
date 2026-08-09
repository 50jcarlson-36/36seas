import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { extractManuscriptText } from "@/lib/manuscript-text";
import { runEditorialReview } from "@/lib/anthropic";
import { checkAndConsumeCredit } from "@/lib/credits";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createServiceRoleClient();

  const { manuscriptId } = await req.json();
  if (!manuscriptId)
    return NextResponse.json({ error: "manuscriptId required" }, { status: 400 });

  const { data: manuscript, error: msErr } = await admin
    .from("manuscripts")
    .select("*")
    .eq("id", manuscriptId)
    .eq("user_id", user.id)
    .single();
  if (msErr || !manuscript)
    return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });

  const credit = await checkAndConsumeCredit(supabase, user.id, "review", manuscriptId);
  if (!credit.ok) return NextResponse.json({ error: credit.error, code: credit.code, balance: credit }, { status: 402 });

  const { data: reviewRow } = await admin
    .from("ai_reviews")
    .insert({ manuscript_id: manuscriptId, user_id: user.id, status: "running" })
    .select()
    .single();

  await admin.from("manuscripts").update({ status: "reviewing" }).eq("id", manuscriptId).eq("user_id", user.id);

  try {
    const { data: fileData, error: dlErr } = await admin.storage
      .from("manuscripts")
      .download(manuscript.file_path);
    if (dlErr || !fileData) throw new Error(dlErr?.message || "Could not download manuscript");

    const buffer = Buffer.from(await fileData.arrayBuffer());
    const text = await extractManuscriptText(buffer, manuscript.file_path);

    const result = await runEditorialReview(manuscript.title, manuscript.genre || "", text);

    await admin
      .from("ai_reviews")
      .update({
        status: "complete",
        model: "claude-sonnet-4-5",
        overall_score: result.overallScore,
        summary: result.summary,
        developmental_notes: result.developmentalNotes,
        line_edits: result.lineEdits,
        readability: {
          ...result.readability,
          strengths: result.strengths,
          marketPositioning: result.marketPositioning,
        },
        completed_at: new Date().toISOString(),
      })
      .eq("id", reviewRow!.id);

    await admin.from("manuscripts").update({ status: "reviewed" }).eq("id", manuscriptId).eq("user_id", user.id);

    return NextResponse.json({ reviewId: reviewRow!.id, result, credits: credit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Review failed";
    await admin
      .from("ai_reviews")
      .update({ status: "failed", error: message })
      .eq("id", reviewRow!.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
