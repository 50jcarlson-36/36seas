import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateChapterDraft } from "@/lib/story";
import { checkAndConsumeCredit } from "@/lib/credits";
import type { CharacterProfile } from "@/lib/story";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { storyProjectId, chapterNumber, authorNotes } = await req.json();
  if (!storyProjectId || !chapterNumber) {
    return NextResponse.json({ error: "storyProjectId and chapterNumber required" }, { status: 400 });
  }

  const { data: project, error: projErr } = await supabase
    .from("story_projects")
    .select("*")
    .eq("id", storyProjectId)
    .single();
  if (projErr || !project) return NextResponse.json({ error: "Story project not found" }, { status: 404 });

  const { data: chapterRow, error: chErr } = await supabase
    .from("story_chapters")
    .select("*")
    .eq("story_project_id", storyProjectId)
    .eq("chapter_number", chapterNumber)
    .single();
  if (chErr || !chapterRow) return NextResponse.json({ error: "Chapter not found" }, { status: 404 });

  const credit = await checkAndConsumeCredit(supabase, user.id, "story", chapterRow.id);
  if (!credit.ok) return NextResponse.json({ error: credit.error, code: credit.code, balance: credit }, { status: 402 });

  let previousChapterEnding: string | undefined;
  if (chapterNumber > 1) {
    const { data: prev } = await supabase
      .from("story_chapters")
      .select("content")
      .eq("story_project_id", storyProjectId)
      .eq("chapter_number", chapterNumber - 1)
      .maybeSingle();
    previousChapterEnding = prev?.content || undefined;
  }

  try {
    const draft = await generateChapterDraft({
      genre: project.genre || "",
      workingTitle: project.title,
      characters: (project.characters || []) as CharacterProfile[],
      chapter: { chapterNumber, title: chapterRow.title, summary: chapterRow.summary || "" },
      previousChapterEnding,
      authorNotes,
    });

    await supabase
      .from("story_chapters")
      .update({
        content: draft.content,
        word_count: draft.wordCount,
        status: "drafted",
      })
      .eq("id", chapterRow.id);

    return NextResponse.json({ content: draft.content, wordCount: draft.wordCount, credits: credit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Chapter generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
