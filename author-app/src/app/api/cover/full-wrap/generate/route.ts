import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateFullWrapCoverPdf } from "@/lib/full-cover";
import { generateCoverBrief } from "@/lib/cover-art";
import { checkAndConsumeCredit } from "@/lib/credits";
import { TRIM_SIZES, validateFullCoverPageCount, type Binding, type PaperType } from "@/lib/kdp-specs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { manuscriptId, binding, trimSize, paperType } = (await req.json()) as {
    manuscriptId: string;
    binding: Binding;
    trimSize: string;
    paperType?: PaperType;
  };

  if (!manuscriptId || !binding || !trimSize) {
    return NextResponse.json({ error: "manuscriptId, binding, and trimSize required" }, { status: 400 });
  }
  if (binding !== "paperback" && binding !== "hardcover") {
    return NextResponse.json({ error: "Choose paperback or hardcover." }, { status: 400 });
  }
  if (!TRIM_SIZES[trimSize]) {
    return NextResponse.json({ error: "Choose a supported final trim size." }, { status: 400 });
  }
  if (paperType && !["white", "cream", "standard_color", "premium_color"].includes(paperType)) {
    return NextResponse.json({ error: "Choose a supported paper and print type." }, { status: 400 });
  }

  const { data: manuscript, error: msErr } = await supabase
    .from("manuscripts")
    .select("*")
    .eq("id", manuscriptId)
    .single();
  if (msErr || !manuscript) return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });

  const { data: finalPrintJob } = await supabase
    .from("formatting_jobs")
    .select("trim_size")
    .eq("manuscript_id", manuscriptId)
    .eq("format_type", "pdf_print")
    .eq("status", "complete")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const effectivePageCount = manuscript.page_count_interior;
  if (!effectivePageCount) {
    return NextResponse.json(
      { error: "No final page count yet — generate the print PDF interior in the Format tab first." },
      { status: 400 }
    );
  }
  if (!finalPrintJob?.trim_size) {
    return NextResponse.json(
      { error: "The final print PDF could not be verified. Generate it again in the Format tab before building a cover." },
      { status: 400 }
    );
  }
  if (trimSize !== finalPrintJob.trim_size) {
    return NextResponse.json(
      { error: `This interior was formatted at ${finalPrintJob.trim_size} in. Reformat the interior before changing the cover trim size.` },
      { status: 400 }
    );
  }
  const pageCountError = validateFullCoverPageCount(binding, effectivePageCount);
  if (pageCountError) return NextResponse.json({ error: pageCountError }, { status: 400 });

  const credit = await checkAndConsumeCredit(supabase, user.id, "cover", manuscriptId);
  if (!credit.ok) return NextResponse.json({ error: credit.error, code: credit.code, balance: credit }, { status: 402 });

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("pen_name, full_name")
      .eq("id", user.id)
      .single();
    const author = profile?.pen_name || profile?.full_name || "Author Name";

    const { data: latestCover } = await supabase
      .from("covers")
      .select("image_path, prompt, style")
      .eq("manuscript_id", manuscriptId)
      .eq("variant", "front")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    let frontCoverImage: { buffer: Buffer; mime: string } | undefined;
    if (latestCover?.image_path && /\.(png|jpe?g)$/i.test(latestCover.image_path)) {
      const { data: file } = await supabase.storage.from("covers").download(latestCover.image_path);
      if (file) {
        frontCoverImage = {
          buffer: Buffer.from(await file.arrayBuffer()),
          mime: /\.png$/i.test(latestCover.image_path) ? "image/png" : "image/jpeg",
        };
      }
    }

    const brief = await generateCoverBrief(
      manuscript.title,
      manuscript.genre || "",
      latestCover?.prompt || "",
      latestCover?.style || "Cinematic Thriller"
    );

    const { buffer, spec } = await generateFullWrapCoverPdf({
      binding,
      trimSize,
      pageCount: effectivePageCount,
      paperType: binding === "hardcover" ? "white" : paperType || "white",
      title: manuscript.title,
      subtitle: manuscript.subtitle,
      author,
      blurb: manuscript.synopsis,
      brief,
      frontCoverImage,
    });

    const variant = binding === "hardcover" ? "hardcover_wrap" : "paperback_wrap";
    const path = `${user.id}/${manuscriptId}/${variant}-${Date.now()}.pdf`;
    const { error: uploadErr } = await supabase.storage
      .from("exports")
      .upload(path, buffer, { contentType: "application/pdf", upsert: true });
    if (uploadErr) throw new Error(uploadErr.message);

    const { data: coverRow, error: insertErr } = await supabase
      .from("covers")
      .insert({
        manuscript_id: manuscriptId,
        user_id: user.id,
        prompt: `Full ${binding} wrap`,
        variant,
        status: "complete",
        image_path: path,
        spec,
      })
      .select()
      .single();
    if (insertErr) throw new Error(insertErr.message);

    const { data: signed } = await supabase.storage.from("exports").createSignedUrl(path, 60 * 60);

    return NextResponse.json({ coverId: coverRow.id, downloadUrl: signed?.signedUrl, spec, credits: credit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Full-cover generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
