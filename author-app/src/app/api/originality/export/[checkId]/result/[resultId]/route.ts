import { NextRequest, NextResponse } from "next/server";
import { originalityWebhookAuthorized } from "@/lib/copyleaks";
import { loadManuscriptChapters } from "@/lib/manuscript-source";
import type { OriginalityMatch } from "@/lib/originality";
import { createServiceRoleClient } from "@/lib/supabase/server";

type PositionGroup = { chars?: { starts?: number[]; lengths?: number[] } };
type ComparisonType = { suspected?: PositionGroup };

async function handle(req: NextRequest, context: { params: Promise<{ checkId: string; resultId: string }> }) {
  const { checkId, resultId } = await context.params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!originalityWebhookAuthorized(req, body)) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });

  const admin = createServiceRoleClient();
  const { data: check } = await admin.from("originality_checks")
    .select("id,manuscript_id,chapter_index,content_hash,matches")
    .eq("id", checkId).maybeSingle();
  if (!check) return NextResponse.json({ error: "Originality check not found" }, { status: 404 });

  const text = (body.text || {}) as Record<string, unknown>;
  const comparison = (text.comparison || {}) as Record<string, ComparisonType>;
  const { data: manuscript } = await admin.from("manuscripts")
    .select("id,user_id,file_path,editor_content")
    .eq("id", check.manuscript_id).maybeSingle();

  let passages: string[] = [];
  if (manuscript) {
    const chapters = await loadManuscriptChapters(admin, manuscript);
    const chapter = chapters[check.chapter_index];
    if (chapter?.contentHash === check.content_hash) passages = suspectedPassages(chapter.body, comparison);
  }
  if (!passages.length && typeof text.value === "string" && text.value.trim()) {
    passages = [text.value.trim().slice(0, 500)];
  }

  const matches = ((check.matches || []) as OriginalityMatch[]).map((match) =>
    match.providerResultId === resultId ? { ...match, passages } : match
  );
  await admin.from("originality_checks").update({ matches }).eq("id", checkId);
  return NextResponse.json({ received: true });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ checkId: string; resultId: string }> }) {
  return handle(req, context);
}

export async function POST(req: NextRequest, context: { params: Promise<{ checkId: string; resultId: string }> }) {
  return handle(req, context);
}

function suspectedPassages(chapter: string, comparison: Record<string, ComparisonType>) {
  const ranges: Array<{ start: number; end: number }> = [];
  for (const category of ["identical", "minorChanges", "relatedMeaning"]) {
    const chars = comparison[category]?.suspected?.chars;
    const starts = chars?.starts || [];
    const lengths = chars?.lengths || [];
    starts.forEach((start, index) => {
      const length = lengths[index] || 0;
      if (Number.isFinite(start) && Number.isFinite(length) && length > 0) {
        ranges.push({ start: Math.max(0, start), end: Math.min(chapter.length, start + length) });
      }
    });
  }
  ranges.sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end + 20) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  return merged.slice(0, 5).map(({ start, end }) => {
    const from = Math.max(0, start - 40);
    const to = Math.min(chapter.length, end + 40);
    return `${from > 0 ? "…" : ""}${chapter.slice(from, to).trim()}${to < chapter.length ? "…" : ""}`;
  }).filter(Boolean);
}
