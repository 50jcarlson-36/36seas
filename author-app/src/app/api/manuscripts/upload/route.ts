import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { extractManuscriptText, wordCount } from "@/lib/manuscript-text";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const title = (form.get("title") as string) || "Untitled Manuscript";
  const subtitle = (form.get("subtitle") as string) || null;
  const genre = (form.get("genre") as string) || null;
  const synopsis = (form.get("synopsis") as string) || null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const buffer = Buffer.from(await file.arrayBuffer());
  const ext = file.name.split(".").pop()?.toLowerCase() || "txt";
  const manuscriptId = crypto.randomUUID();
  const path = `${user.id}/${manuscriptId}/${file.name}`;

  const { error: uploadErr } = await supabase.storage
    .from("manuscripts")
    .upload(path, buffer, { contentType: file.type || "application/octet-stream" });

  if (uploadErr) {
    return NextResponse.json({ error: uploadErr.message }, { status: 500 });
  }

  let text = "";
  try {
    text = await extractManuscriptText(buffer, file.name);
  } catch {
    // non-fatal; word count / review will just be unavailable until a supported file is used
  }

  // Supply the id ourselves and avoid RETURNING the row. The production RLS
  // recursion is on the SELECT path; the owner-only INSERT policy is valid.
  const manuscript = {
    id: manuscriptId,
    user_id: user.id,
    title,
    subtitle,
    genre,
    synopsis,
    word_count: text ? wordCount(text) : null,
    file_path: path,
    file_type: ext,
    status: "uploaded",
  };
  const { error: insertErr } = await supabase
    .from("manuscripts")
    .insert(manuscript);

  if (insertErr) {
    await supabase.storage.from("manuscripts").remove([path]);
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ manuscript });
}
