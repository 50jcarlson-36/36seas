import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { checkAndConsumeCredit } from "@/lib/credits";
import { generateCutPasteSheet } from "@/lib/submission-sheet";
import { assignIsbn } from "@/lib/isbn";
import type { FullCoverSpec } from "@/lib/kdp-specs";
import JSZip from "jszip";
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

  const { manuscriptId, metadata } = await req.json();
  if (!manuscriptId || !metadata)
    return NextResponse.json({ error: "manuscriptId and metadata required" }, { status: 400 });

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
  if (!acceptance.data) return NextResponse.json({ error: "Accept the originality and publishing-rights statement before packaging your book.", code: "LEGAL_ACCEPTANCE_REQUIRED" }, { status: 409 });
  if (!gate.ready) return NextResponse.json({
    error: `Clear every current chapter in Review before packaging (${gate.completeCount}/${gate.totalCount} cleared).`,
    code: "ORIGINALITY_REQUIRED",
    gate,
  }, { status: 409 });

  const credit = await checkAndConsumeCredit(supabase, user.id, "submission", manuscriptId);
  if (!credit.ok) return NextResponse.json({ error: credit.error, code: credit.code, balance: credit }, { status: 402 });

  // Optionally pull the next ISBN from the publisher's pool for formats requested.
  let isbnPaperback = manuscript.isbn_paperback as string | null;
  let isbnHardcover = manuscript.isbn_hardcover as string | null;
  if (metadata.autoAssignIsbn?.paperback && !isbnPaperback) {
    const assigned = await assignIsbn(admin, manuscriptId, "paperback");
    if (assigned) isbnPaperback = assigned.isbn13;
  }
  if (metadata.autoAssignIsbn?.hardcover && !isbnHardcover) {
    const assigned = await assignIsbn(admin, manuscriptId, "hardcover");
    if (assigned) isbnHardcover = assigned.isbn13;
  }

  const zip = new JSZip();

  const [epubJob, pdfJob, docxJob, frontCover, paperbackWrap, hardcoverWrap] = await Promise.all([
    admin
      .from("formatting_jobs")
      .select("file_path")
      .eq("manuscript_id", manuscriptId)
      .eq("format_type", "epub")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("formatting_jobs")
      .select("file_path")
      .eq("manuscript_id", manuscriptId)
      .eq("format_type", "pdf_print")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("formatting_jobs")
      .select("file_path")
      .eq("manuscript_id", manuscriptId)
      .eq("format_type", "docx")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("covers")
      .select("image_path")
      .eq("manuscript_id", manuscriptId)
      .eq("variant", "front")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("covers")
      .select("image_path, spec")
      .eq("manuscript_id", manuscriptId)
      .eq("variant", "paperback_wrap")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("covers")
      .select("image_path, spec")
      .eq("manuscript_id", manuscriptId)
      .eq("variant", "hardcover_wrap")
      .eq("status", "complete")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (epubJob.data?.file_path) {
    const { data } = await admin.storage.from("exports").download(epubJob.data.file_path);
    if (data) zip.file("ebook.epub", Buffer.from(await data.arrayBuffer()));
  }
  if (pdfJob.data?.file_path) {
    const { data } = await admin.storage.from("exports").download(pdfJob.data.file_path);
    if (data) zip.file("print-interior.pdf", Buffer.from(await data.arrayBuffer()));
  }
  if (docxJob.data?.file_path) {
    const { data } = await admin.storage.from("exports").download(docxJob.data.file_path);
    if (data) zip.file("editable-manuscript.docx", Buffer.from(await data.arrayBuffer()));
  }
  if (frontCover.data?.image_path) {
    const { data } = await admin.storage.from("covers").download(frontCover.data.image_path);
    const coverExt = frontCover.data.image_path.split(".").pop();
    if (data) zip.file(`cover-art.${coverExt}`, Buffer.from(await data.arrayBuffer()));
  }
  if (paperbackWrap.data?.image_path) {
    const { data } = await admin.storage.from("exports").download(paperbackWrap.data.image_path);
    if (data) zip.file("paperback-full-cover.pdf", Buffer.from(await data.arrayBuffer()));
  }
  if (hardcoverWrap.data?.image_path) {
    const { data } = await admin.storage.from("exports").download(hardcoverWrap.data.image_path);
    if (data) zip.file("hardcover-full-cover.pdf", Buffer.from(await data.arrayBuffer()));
  }

  const kdpMetadata = {
    title: metadata.title || manuscript.title,
    subtitle: metadata.subtitle || manuscript.subtitle || "",
    description: metadata.description || manuscript.synopsis || "",
    keywords: metadata.keywords || [],
    categories: metadata.categories || [],
    primaryMarketplace: "Amazon.com",
    price: metadata.price ?? null,
    pageCountInterior: manuscript.page_count_interior,
    isbn: { paperback: isbnPaperback, hardcover: isbnHardcover, ebook: manuscript.isbn_ebook },
    aiContentDisclosure: {
      containsAiGeneratedText: !!metadata.aiDisclosure?.text,
      containsAiGeneratedImages: !!metadata.aiDisclosure?.images,
      containsAiGeneratedTranslation: !!metadata.aiDisclosure?.translation,
      note:
        "As of 2026, KDP requires disclosing AI-assisted content during the 'Create a New Title' setup flow. This file is a submission aid, not an automated KDP upload — Amazon has no public API for book submission, so you'll enter these values manually at kdp.amazon.com.",
    },
    publisher: "36Seas Publishing",
    generatedAt: new Date().toISOString(),
  };

  zip.file("metadata.json", JSON.stringify(kdpMetadata, null, 2));

  const cutPasteSheet = generateCutPasteSheet({
    title: kdpMetadata.title,
    subtitle: kdpMetadata.subtitle,
    author: metadata.author || "",
    description: kdpMetadata.description,
    keywords: kdpMetadata.keywords,
    categories: kdpMetadata.categories,
    price: kdpMetadata.price,
    pageCountInterior: manuscript.page_count_interior || undefined,
    isbnPaperback: isbnPaperback || undefined,
    isbnHardcover: isbnHardcover || undefined,
    isbnEbook: manuscript.isbn_ebook || undefined,
    aiDisclosure: {
      text: !!metadata.aiDisclosure?.text,
      images: !!metadata.aiDisclosure?.images,
      translation: !!metadata.aiDisclosure?.translation,
    },
    paperbackSpec: (paperbackWrap.data?.spec as FullCoverSpec | undefined) || undefined,
    hardcoverSpec: (hardcoverWrap.data?.spec as FullCoverSpec | undefined) || undefined,
  });
  zip.file("SUBMISSION-SHEET.txt", cutPasteSheet);

  const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
  const path = `${user.id}/${manuscriptId}/submission-package-${Date.now()}.zip`;

  const { error: uploadErr } = await admin.storage
    .from("exports")
    .upload(path, zipBuffer, { contentType: "application/zip", upsert: true });
  if (uploadErr) return NextResponse.json({ error: uploadErr.message }, { status: 500 });

  const { data: pkgRow, error: insertErr } = await admin
    .from("submission_packages")
    .insert({
      manuscript_id: manuscriptId,
      user_id: user.id,
      metadata: kdpMetadata,
      ai_content_disclosure: !!(
        metadata.aiDisclosure?.text ||
        metadata.aiDisclosure?.images ||
        metadata.aiDisclosure?.translation
      ),
      package_path: path,
      status: "packaged",
    })
    .select()
    .single();
  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 });

  await admin.from("manuscripts").update({ status: "ready_to_submit" }).eq("id", manuscriptId).eq("user_id", user.id);

  const { data: signed } = await admin.storage.from("exports").createSignedUrl(path, 60 * 60);

  return NextResponse.json({ packageId: pkgRow.id, downloadUrl: signed?.signedUrl, credits: credit });
}
