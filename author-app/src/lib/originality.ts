import type { SupabaseClient } from "@supabase/supabase-js";
import type { BookChapter } from "./book-structure";

export type OriginalityMatch = {
  providerResultId?: string;
  title: string;
  url?: string;
  matchedWords?: number;
  passages?: string[];
  explanation?: string;
  severity?: "low" | "medium" | "high";
};

export type OriginalityCheckRow = {
  id: string;
  chapter_index: number;
  chapter_title: string;
  content_hash: string;
  provider: string;
  status: "running" | "passed" | "flagged" | "failed";
  similarity_percent: number | null;
  matches: OriginalityMatch[];
  acknowledged_at: string | null;
  error: string | null;
  created_at: string;
};

export function evaluateOriginalityGate(chapters: BookChapter[], checks: OriginalityCheckRow[]) {
  const latestByChapter = new Map<number, OriginalityCheckRow>();
  for (const check of checks) {
    if (!latestByChapter.has(check.chapter_index)) latestByChapter.set(check.chapter_index, check);
  }
  const chaptersState = chapters.map((chapter) => {
    const check = latestByChapter.get(chapter.index);
    const current = !!check && check.content_hash === chapter.contentHash;
    const ready = current && (check.status === "passed" || (check.status === "flagged" && !!check.acknowledged_at));
    return { ...chapter, check, current, ready };
  });
  return {
    ready: chaptersState.length > 0 && chaptersState.every((chapter) => chapter.ready),
    completeCount: chaptersState.filter((chapter) => chapter.ready).length,
    totalCount: chaptersState.length,
    chapters: chaptersState,
  };
}

export async function loadOriginalityGate(
  admin: SupabaseClient,
  manuscriptId: string,
  chapters: BookChapter[]
) {
  const { data, error } = await admin
    .from("originality_checks")
    .select("id,chapter_index,chapter_title,content_hash,provider,status,similarity_percent,matches,acknowledged_at,error,created_at")
    .eq("manuscript_id", manuscriptId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return evaluateOriginalityGate(chapters, (data || []) as OriginalityCheckRow[]);
}
