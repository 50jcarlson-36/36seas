import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractManuscriptText, wordCount } from "@/lib/manuscript-text";

type RouteContext = { params: Promise<{ id: string }> };

async function getOwnedManuscript(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated", status: 401 } as const;

  const { data: manuscript, error } = await supabase
    .from("manuscripts")
    .select("id, user_id, file_path, file_type, title, editor_content, writing_profile")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !manuscript) return { error: "Manuscript not found", status: 404 } as const;
  return { supabase, user, manuscript } as const;
}

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const result = await getOwnedManuscript(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  if (!result.manuscript.file_path) {
    return NextResponse.json({
      content: "",
      editorContent: result.manuscript.editor_content || "",
      writingProfile: result.manuscript.writing_profile || {},
      wordCount: 0,
    });
  }

  const { data, error } = await result.supabase.storage
    .from("manuscripts")
    .download(result.manuscript.file_path);

  if (error || !data) {
    return NextResponse.json({ error: error?.message || "Could not load manuscript" }, { status: 500 });
  }

  try {
    const buffer = Buffer.from(await data.arrayBuffer());
    const content = await extractManuscriptText(buffer, result.manuscript.file_path);
    return NextResponse.json({
      content,
      editorContent: result.manuscript.editor_content || "",
      writingProfile: result.manuscript.writing_profile || {},
      wordCount: wordCount(content),
    });
  } catch {
    return NextResponse.json(
      { error: "This manuscript could not be opened in the editor." },
      { status: 422 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const result = await getOwnedManuscript(id);
  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  const body = (await req.json().catch(() => null)) as {
    content?: unknown;
    editorContent?: unknown;
    writingProfile?: unknown;
  } | null;
  if (!body || typeof body.content !== "string") {
    return NextResponse.json({ error: "Manuscript content is required" }, { status: 400 });
  }
  if (body.content.length > 2_500_000) {
    return NextResponse.json({ error: "This manuscript is too large to save in one document." }, { status: 413 });
  }
  if (typeof body.editorContent === "string" && body.editorContent.length > 4_000_000) {
    return NextResponse.json({ error: "This formatted manuscript is too large to save in one document." }, { status: 413 });
  }

  const writingProfile = body.writingProfile && typeof body.writingProfile === "object" && !Array.isArray(body.writingProfile)
    ? body.writingProfile as Record<string, unknown>
    : undefined;

  const path = `${result.user.id}/${id}-working.txt`;
  const buffer = Buffer.from(body.content, "utf-8");
  const { error: uploadError } = await result.supabase.storage
    .from("manuscripts")
    .upload(path, buffer, { contentType: "text/plain; charset=utf-8", upsert: true });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const count = wordCount(body.content);
  const { error: updateError } = await result.supabase
    .from("manuscripts")
    .update({
      file_path: path,
      file_type: "txt",
      word_count: count,
      status: "uploaded",
      ...(typeof body.editorContent === "string" ? { editor_content: body.editorContent } : {}),
      ...(writingProfile ? { writing_profile: writingProfile } : {}),
    })
    .eq("id", id)
    .eq("user_id", result.user.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ saved: true, wordCount: count, savedAt: new Date().toISOString() });
}
