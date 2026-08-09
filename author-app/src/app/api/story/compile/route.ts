import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { wordCount as countWords } from "@/lib/manuscript-text";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { storyProjectId } = await req.json();
  if (!storyProjectId) return NextResponse.json({ error: "storyProjectId required" }, { status: 400 });

  const { data: project, error: projErr } = await supabase
    .from("story_projects")
    .select("*")
    .eq("id", storyProjectId)
    .single();
  if (projErr || !project) return NextResponse.json({ error: "Story project not found" }, { status: 404 });

  const { data: chapters, error: chErr } = await supabase
    .from("story_chapters")
    .select("*")
    .eq("story_project_id", storyProjectId)
    .order("chapter_number", { ascending: true });
  if (chErr) return NextResponse.json({ error: chErr.message }, { status: 500 });

  const drafted = (chapters || []).filter((c) => c.status === "drafted" && c.content);
  if (drafted.length === 0) {
    return NextResponse.json({ error: "No drafted chapters yet — generate at least one chapter first." }, { status: 400 });
  }

  const fullText = drafted
    .map((c) => `Chapter ${c.chapter_number}: ${c.title}\n\n${c.content}`)
    .join("\n\n\n");

  const buffer = Buffer.from(fullText, "utf-8");
  const path = `${user.id}/${crypto.randomUUID()}-${project.title.replace(/[^a-z0-9]+/gi, "-")}.txt`;

  const { error: uploadErr } = await supabase.storage
    .from("manuscripts")
    .upload(path, buffer, { contentType: "text/plain" });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: manuscript, error: msErr } = await supabase
    .from("manuscripts")
    .insert({
      user_id: user.id,
      title: project.title,
      genre: project.genre,
      synopsis: project.premise,
      word_count: countWords(fullText),
      file_path: path,
      file_type: "txt",
      status: "uploaded",
      workspace_id: project.workspace_id,
    })
    .select()
    .single();
  if (msErr) return NextResponse.json({ error: msErr.message }, { status: 500 });

  await supabase
    .from("story_projects")
    .update({ status: "complete", compiled_manuscript_id: manuscript.id })
    .eq("id", storyProjectId);

  return NextResponse.json({ manuscriptId: manuscript.id });
}
