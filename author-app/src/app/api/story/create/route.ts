import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateStoryOutline } from "@/lib/story";
import { checkAndConsumeCredit } from "@/lib/credits";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { genre, premise, mainCharacterName, mainCharacterGoal, mainCharacterTrait, setting, chapterCount } =
    await req.json();

  if (!genre || !premise) {
    return NextResponse.json({ error: "genre and premise are required" }, { status: 400 });
  }

  const credit = await checkAndConsumeCredit(supabase, user.id, "story");
  if (!credit.ok) return NextResponse.json({ error: credit.error, code: credit.code, balance: credit }, { status: 402 });

  try {
    const result = await generateStoryOutline({
      genre,
      premise,
      mainCharacterName: mainCharacterName || "The protagonist",
      mainCharacterGoal: mainCharacterGoal || "",
      mainCharacterTrait: mainCharacterTrait || "",
      setting: setting || "",
      chapterCount,
    });

    const { data: project, error: insertErr } = await supabase
      .from("story_projects")
      .insert({
        user_id: user.id,
        title: result.workingTitle,
        genre,
        premise,
        main_character: { name: mainCharacterName, goal: mainCharacterGoal, trait: mainCharacterTrait },
        setting,
        outline: result.outline,
        characters: result.characters,
        status: "drafting",
      })
      .select()
      .single();
    if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

    const chapterRows = result.outline.map((c) => ({
      story_project_id: project.id,
      user_id: user.id,
      chapter_number: c.chapterNumber,
      title: c.title,
      summary: c.summary,
      status: "pending" as const,
    }));
    await supabase.from("story_chapters").insert(chapterRows);

    return NextResponse.json({ project, outline: result.outline, characters: result.characters, logline: result.logline, credits: credit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Could not generate outline";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
