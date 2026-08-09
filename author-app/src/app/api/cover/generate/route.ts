import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateCoverBrief, generateCoverImage } from "@/lib/cover-art";
import { checkAndConsumeCredit } from "@/lib/credits";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createServiceRoleClient();

  const { manuscriptId, prompt, style } = await req.json();
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

  const credit = await checkAndConsumeCredit(supabase, user.id, "cover", manuscriptId);
  if (!credit.ok) return NextResponse.json({ error: credit.error, code: credit.code, balance: credit }, { status: 402 });

  const { data: coverRow } = await admin
    .from("covers")
    .insert({
      manuscript_id: manuscriptId,
      user_id: user.id,
      prompt: prompt || "",
      style: style || null,
      status: "running",
    })
    .select()
    .single();

  try {
    const { data: profile } = await admin
      .from("profiles")
      .select("pen_name, full_name")
      .eq("id", user.id)
      .single();
    const author = profile?.pen_name || profile?.full_name || "Author Name";

    const visualStyle = style || "Cinematic Thriller";
    const brief = await generateCoverBrief(manuscript.title, manuscript.genre || "", prompt || "", visualStyle);
    const { buffer, mime, ext } = await generateCoverImage(
      manuscript.title,
      manuscript.subtitle,
      author,
      brief,
      manuscript.genre || "",
      visualStyle
    );

    const path = `${user.id}/${manuscriptId}/${coverRow!.id}.${ext}`;
    const { error: uploadErr } = await admin.storage
      .from("covers")
      .upload(path, buffer, { contentType: mime, upsert: true });
    if (uploadErr) throw new Error(uploadErr.message);

    await admin
      .from("covers")
      .update({ status: "complete", image_path: path })
      .eq("id", coverRow!.id);

    const { data: signed } = await admin.storage
      .from("covers")
      .createSignedUrl(path, 60 * 60);

    return NextResponse.json({ coverId: coverRow!.id, imagePath: path, previewUrl: signed?.signedUrl, brief, credits: credit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Cover generation failed";
    await admin.from("covers").update({ status: "failed", error: message }).eq("id", coverRow!.id).eq("user_id", user.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
