import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { loadManuscriptChapters } from "@/lib/manuscript-source";
import { loadOriginalityGate } from "@/lib/originality";
import { ORIGINALITY_TERMS_VERSION } from "@/lib/legal";
import { audiobookEstimate, narrationChunks } from "@/lib/audiobook";
import { checkAndConsumeCredits } from "@/lib/credits";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (process.env.TYPECAST_COMMERCIAL_REDISTRIBUTION_APPROVED !== "true") {
    return NextResponse.json({ error: "Audiobook production is in preview while 36Seas completes its commercial API and distribution agreement. No credits were used.", code: "PROVIDER_AGREEMENT_REQUIRED" }, { status: 503 });
  }
  if (!process.env.TYPECAST_API_TOKEN) return NextResponse.json({ error: "Audiobook production is not configured. No credits were used." }, { status: 503 });
  const { manuscriptId, voiceId, voiceName, style = "smart", pace = 1 } = await req.json();
  if (!manuscriptId || !voiceId || !voiceName) return NextResponse.json({ error: "Choose a narrator voice first." }, { status: 400 });
  if (typeof style !== "string" || style.length > 80) return NextResponse.json({ error: "Choose a valid narration style." }, { status: 400 });
  const admin = createServiceRoleClient();
  const { data: manuscript } = await admin.from("manuscripts").select("*").eq("id", manuscriptId).eq("user_id", user.id).single();
  if (!manuscript) return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });
  const chapters = await loadManuscriptChapters(admin, manuscript);
  const [gate, acceptance] = await Promise.all([
    loadOriginalityGate(admin, manuscriptId, chapters),
    admin.from("legal_acceptances").select("id").eq("user_id", user.id).eq("document_type", "terms_and_originality").eq("document_version", ORIGINALITY_TERMS_VERSION).maybeSingle(),
  ]);
  if (!acceptance.data || !gate.ready) return NextResponse.json({ error: "Accept the publishing-rights statement and clear every current chapter before creating saleable audio.", code: "PUBLISHING_GATE_REQUIRED" }, { status: 409 });
  const estimate = audiobookEstimate(chapters);
  const { data: job, error: jobError } = await admin.from("audiobook_jobs").insert({
    manuscript_id: manuscriptId, user_id: user.id, voice_id: voiceId, voice_name: voiceName,
    narration_style: style, word_count: estimate.wordCount, character_count: estimate.characterCount,
    credits_charged: estimate.credits, status: "pending",
  }).select().single();
  if (jobError || !job) return NextResponse.json({ error: jobError?.message || "Could not create audiobook job" }, { status: 500 });
  const credit = await checkAndConsumeCredits(supabase, user.id, "audio", estimate.credits, job.id);
  if (!credit.ok) {
    await admin.from("audiobook_jobs").delete().eq("id", job.id);
    return NextResponse.json({ error: credit.error, code: credit.code, balance: credit }, { status: 402 });
  }

  try {
    await admin.from("audiobook_jobs").update({ status: "running" }).eq("id", job.id);
    const typecastEndpoint = process.env.TYPECAST_TTS_ENDPOINT || "https://api.typecast.ai/v1/text-to-speech";
    const zip = new JSZip();
    const manifest: Array<{ chapter: string; files: string[] }> = [];
    for (const chapter of chapters) {
      const files: string[] = [];
      const parts = narrationChunks(chapter.body);
      for (let part = 0; part < parts.length; part++) {
        const prompt = style === "smart"
          ? { emotion_type: "smart" }
          : { emotion_type: "preset", emotion_preset: style, emotion_intensity: 1 };
        const response = await fetch(typecastEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-API-KEY": process.env.TYPECAST_API_TOKEN },
          body: JSON.stringify({
            voice_id: voiceId, text: parts[part], model: "ssfm-v30", language: "eng",
            prompt,
            output: { volume: 100, audio_pitch: 0, audio_tempo: Math.max(0.7, Math.min(1.3, Number(pace) || 1)), audio_format: "mp3" },
          }),
        });
        if (!response.ok) throw new Error(`Narration provider failed on ${chapter.title}, part ${part + 1}.`);
        const name = `${String(chapter.index + 1).padStart(2, "0")}-${chapter.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 45)}${parts.length > 1 ? `-${part + 1}` : ""}.mp3`;
        zip.file(name, Buffer.from(await response.arrayBuffer()));
        files.push(name);
      }
      manifest.push({ chapter: chapter.title, files });
    }
    zip.file("audiobook-manifest.json", JSON.stringify({ title: manuscript.title, narrator: voiceName, chapters: manifest }, null, 2));
    const buffer = await zip.generateAsync({ type: "nodebuffer" });
    const packagePath = `${user.id}/${manuscriptId}/audiobook-${job.id}.zip`;
    const { error: uploadError } = await admin.storage.from("exports").upload(packagePath, buffer, { contentType: "application/zip", upsert: true });
    if (uploadError) throw new Error(uploadError.message);
    await admin.from("audiobook_jobs").update({ status: "complete", audio_manifest: manifest, package_path: packagePath }).eq("id", job.id);
    const { data: signed } = await admin.storage.from("exports").createSignedUrl(packagePath, 3600);
    return NextResponse.json({ jobId: job.id, downloadUrl: signed?.signedUrl, credits: credit });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Audiobook generation failed";
    await admin.from("audiobook_jobs").update({ status: "failed", error: message }).eq("id", job.id);
    return NextResponse.json({ error: message, charged: true }, { status: 502 });
  }
}
