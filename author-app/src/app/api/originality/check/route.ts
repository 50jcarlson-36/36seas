import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { checkAndConsumeCredit } from "@/lib/credits";
import { loadManuscriptChapters } from "@/lib/manuscript-source";
import { runOpenAIOriginalityRiskReview } from "@/lib/openai-originality";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "The AI originality risk review is not configured yet. No credit was used." }, { status: 503 });
  }

  const { manuscriptId, chapterIndex } = await req.json();
  if (!manuscriptId || !Number.isInteger(chapterIndex) || chapterIndex < 0) {
    return NextResponse.json({ error: "A manuscript and chapter are required." }, { status: 400 });
  }
  const admin = createServiceRoleClient();
  const { data: manuscript } = await admin.from("manuscripts").select("id,user_id,title,file_path,editor_content")
    .eq("id", manuscriptId).eq("user_id", user.id).single();
  if (!manuscript) return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });

  const chapters = await loadManuscriptChapters(admin, manuscript);
  const chapter = chapters[chapterIndex];
  if (!chapter || chapter.body.split(/\s+/).length < 20) {
    return NextResponse.json({ error: "This chapter needs at least 20 words before it can be checked." }, { status: 400 });
  }

  const { data: check, error: insertError } = await admin.from("originality_checks").insert({
    manuscript_id: manuscriptId,
    user_id: user.id,
    chapter_index: chapter.index,
    chapter_title: chapter.title,
    content_hash: chapter.contentHash,
    provider: "openai-risk-review",
    status: "running",
  }).select().single();
  if (insertError || !check) return NextResponse.json({ error: insertError?.message || "Could not start check" }, { status: 500 });

  const credit = await checkAndConsumeCredit(supabase, user.id, "originality", check.id);
  if (!credit.ok) {
    await admin.from("originality_checks").delete().eq("id", check.id);
    return NextResponse.json({ error: credit.error, code: credit.code, balance: credit }, { status: 402 });
  }

  try {
    const result = await runOpenAIOriginalityRiskReview({
      userId: user.id,
      title: manuscript.title,
      chapterTitle: chapter.title,
      chapterBody: chapter.body,
    });
    const threshold = Number(process.env.OPENAI_ORIGINALITY_RISK_THRESHOLD || 35);
    const status = result.riskScore >= threshold ? "flagged" : "passed";
    const { data: completed, error: updateError } = await admin.from("originality_checks").update({
      status,
      similarity_percent: result.riskScore,
      matches: result.matches,
      error: null,
    }).eq("id", check.id).select().single();
    if (updateError || !completed) throw new Error(updateError?.message || "Could not save the originality risk review.");
    return NextResponse.json({ check: completed, summary: result.summary, credits: credit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Originality check failed";
    await admin.from("originality_checks").update({ status: "failed", error: message }).eq("id", check.id);
    return NextResponse.json({ error: message, charged: true }, { status: 502 });
  }
}
