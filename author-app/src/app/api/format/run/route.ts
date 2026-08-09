import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { generateDocx, generateEpub, generatePrintPdf } from "@/lib/formatting";
import { checkAndConsumeCredit } from "@/lib/credits";
import { generateCopyrightPageText } from "@/lib/copyright-page";
import { loadManuscriptChapters } from "@/lib/manuscript-source";
import { loadOriginalityGate } from "@/lib/originality";
import { ORIGINALITY_TERMS_VERSION } from "@/lib/legal";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createServiceRoleClient();

  const { manuscriptId, formatType, trimSize } = await req.json();
  if (!manuscriptId || !formatType)
    return NextResponse.json({ error: "manuscriptId and formatType required" }, { status: 400 });

  if (!["epub", "pdf_print", "docx"].includes(formatType)) {
    return NextResponse.json({ error: "Unsupported export format" }, { status: 400 });
  }

  const { data: manuscript, error: msErr } = await admin
    .from("manuscripts")
    .select("*")
    .eq("id", manuscriptId)
    .eq("user_id", user.id)
    .single();
  if (msErr || !manuscript)
    return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });

  const chapters = await loadManuscriptChapters(admin, manuscript);
  const [gate, acceptance] = await Promise.all([
    loadOriginalityGate(admin, manuscriptId, chapters),
    admin.from("legal_acceptances").select("id").eq("user_id", user.id)
      .eq("document_type", "terms_and_originality").eq("document_version", ORIGINALITY_TERMS_VERSION).maybeSingle(),
  ]);
  if (!acceptance.data) return NextResponse.json({ error: "Accept the originality and publishing-rights statement before exporting.", code: "LEGAL_ACCEPTANCE_REQUIRED" }, { status: 409 });
  if (!gate.ready) return NextResponse.json({
    error: `Originality clearance is required for every current chapter before export (${gate.completeCount}/${gate.totalCount} cleared).`,
    code: "ORIGINALITY_REQUIRED",
    gate,
  }, { status: 409 });

  const { data: jobRow, error: jobError } = await admin
    .from("formatting_jobs")
    .insert({
      manuscript_id: manuscriptId,
      user_id: user.id,
      format_type: formatType,
      trim_size: trimSize || "6x9",
      status: "pending",
    })
    .select()
    .single();
  if (jobError || !jobRow) return NextResponse.json({ error: jobError?.message || "Could not create export job" }, { status: 500 });

  const credit = await checkAndConsumeCredit(supabase, user.id, "format", jobRow.id);
  if (!credit.ok) {
    await admin.from("formatting_jobs").delete().eq("id", jobRow.id);
    return NextResponse.json({ error: credit.error, code: credit.code, balance: credit }, { status: 402 });
  }
  await admin.from("formatting_jobs").update({ status: "running" }).eq("id", jobRow.id);

  try {
    const text = chapters.map((chapter) => `${chapter.title}\n\n${chapter.body}`).join("\n\n");

    const { data: profile } = await admin
      .from("profiles")
      .select("pen_name, full_name")
      .eq("id", user.id)
      .single();
    const author = profile?.pen_name || profile?.full_name || "Author Name";

    let outBuffer: Buffer;
    let outExt: string;
    let contentType: string;

    if (formatType === "epub") {
      const { data: cover } = await admin
        .from("covers")
        .select("image_path")
        .eq("manuscript_id", manuscriptId)
        .eq("variant", "front")
        .eq("status", "complete")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let coverBuffer: Buffer | undefined;
      let coverExt: string | undefined;
      if (cover?.image_path) {
        const { data: coverFile } = await admin.storage.from("covers").download(cover.image_path);
        if (coverFile) {
          coverBuffer = Buffer.from(await coverFile.arrayBuffer());
          coverExt = cover.image_path.split(".").pop();
        }
      }

      outBuffer = await generateEpub({
        title: manuscript.title,
        author,
        genre: manuscript.genre,
        description: manuscript.synopsis,
        manuscriptText: text,
        chapters,
        coverBuffer,
        coverExt,
        copyrightPageText: generateCopyrightPageText({
          title: manuscript.title,
          author,
          copyrightHolder: manuscript.copyright_holder || author,
          pubYear: manuscript.pub_year || undefined,
          isbn: manuscript.isbn_ebook || undefined,
        }),
      });
      outExt = "epub";
      contentType = "application/epub+zip";
    } else if (formatType === "docx") {
      outBuffer = await generateDocx({
        title: manuscript.title,
        author,
        chapters,
        copyrightPageText: generateCopyrightPageText({
          title: manuscript.title,
          author,
          copyrightHolder: manuscript.copyright_holder || author,
          pubYear: manuscript.pub_year || undefined,
          isbn: manuscript.isbn_paperback || undefined,
        }),
      });
      outExt = "docx";
      contentType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    } else {
      const copyrightPageText = generateCopyrightPageText({
        title: manuscript.title,
        author,
        copyrightHolder: manuscript.copyright_holder || author,
        pubYear: manuscript.pub_year || undefined,
        isbn: manuscript.isbn_paperback || undefined,
      });
      const printResult = await generatePrintPdf({
        title: manuscript.title,
        author,
        manuscriptText: text,
        chapters,
        trimSize: trimSize || "6x9",
        copyrightPageText,
      });
      outBuffer = printResult.buffer;
      outExt = "pdf";
      contentType = "application/pdf";
      await admin
        .from("manuscripts")
        .update({ page_count_interior: printResult.pageCount })
        .eq("id", manuscriptId);
    }

    const path = `${user.id}/${manuscriptId}/${jobRow.id}.${outExt}`;
    const { error: uploadErr } = await admin.storage
      .from("exports")
      .upload(path, outBuffer, { contentType, upsert: true });
    if (uploadErr) throw new Error(uploadErr.message);

    await admin
      .from("formatting_jobs")
      .update({ status: "complete", file_path: path })
      .eq("id", jobRow.id);
    await admin.from("manuscripts").update({ status: "formatted" }).eq("id", manuscriptId).eq("user_id", user.id);

    const { data: signed } = await admin.storage.from("exports").createSignedUrl(path, 60 * 60);

    return NextResponse.json({ jobId: jobRow.id, filePath: path, downloadUrl: signed?.signedUrl, credits: credit });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Formatting failed";
    await admin.from("formatting_jobs").update({ status: "failed", error: message }).eq("id", jobRow.id).eq("user_id", user.id);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
