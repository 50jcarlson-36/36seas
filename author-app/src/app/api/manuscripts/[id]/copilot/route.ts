import { NextRequest, NextResponse } from "next/server";
import { runWritingCopilot, type CopilotMessage, type WritingProfile } from "@/lib/anthropic";
import { checkAndConsumeCredit } from "@/lib/credits";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { AI_WRITING_PARTNER_NAME } from "@/lib/brand";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    message?: unknown;
    selection?: unknown;
    documentExcerpt?: unknown;
    profile?: unknown;
    history?: unknown;
  } | null;
  if (!body || typeof body.message !== "string" || !body.message.trim()) {
    return NextResponse.json({ error: `Tell ${AI_WRITING_PARTNER_NAME} what you want to work on.` }, { status: 400 });
  }
  if (body.message.length > 8_000) {
    return NextResponse.json({ error: "Please shorten this request before sending it." }, { status: 413 });
  }

  const admin = createServiceRoleClient();
  const { data: manuscript, error } = await admin
    .from("manuscripts")
    .select("id, title, genre, synopsis, writing_profile")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();
  if (error || !manuscript) {
    return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });
  }

  const profile = body.profile && typeof body.profile === "object" && !Array.isArray(body.profile)
    ? body.profile as WritingProfile
    : manuscript.writing_profile as WritingProfile;
  const history = Array.isArray(body.history)
    ? body.history.filter((item): item is CopilotMessage => {
      if (!item || typeof item !== "object") return false;
      const candidate = item as Record<string, unknown>;
      return (candidate.role === "user" || candidate.role === "assistant") && typeof candidate.content === "string";
    }).slice(-8)
    : [];

  const credit = await checkAndConsumeCredit(supabase, user.id, "story", id);
  if (!credit.ok) {
    return NextResponse.json({ error: credit.error, code: credit.code, remaining: credit.remaining, balance: credit }, { status: 402 });
  }

  try {
    const result = await runWritingCopilot({
      title: manuscript.title,
      genre: manuscript.genre || "",
      synopsis: manuscript.synopsis || "",
      message: body.message.trim(),
      selection: typeof body.selection === "string" ? body.selection.slice(0, 20_000) : "",
      documentExcerpt: typeof body.documentExcerpt === "string" ? body.documentExcerpt.slice(0, 60_000) : "",
      profile,
      history,
    });
    return NextResponse.json({ ...result, remaining: credit.remaining });
  } catch (copilotError) {
    return NextResponse.json(
      { error: copilotError instanceof Error ? copilotError.message : "The writing partner is temporarily unavailable." },
      { status: 500 }
    );
  }
}
