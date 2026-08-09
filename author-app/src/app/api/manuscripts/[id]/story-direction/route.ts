import { NextRequest, NextResponse } from "next/server";
import { checkAndConsumeCredit } from "@/lib/credits";
import { mapStoryDirection } from "@/lib/story-direction";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { AI_WRITING_PARTNER_NAME } from "@/lib/brand";

type RouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 60;

function profileFrom(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, fieldValue]) => typeof fieldValue === "string")
      .map(([key, fieldValue]) => [key, (fieldValue as string).slice(0, 4_000)])
  );
}

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    documentExcerpt?: unknown;
    currentProfile?: unknown;
  } | null;
  if (!body || typeof body.documentExcerpt !== "string" || body.documentExcerpt.trim().length < 80) {
    return NextResponse.json({ error: `Add a little more manuscript text before asking ${AI_WRITING_PARTNER_NAME} to map the story.` }, { status: 400 });
  }
  if (body.documentExcerpt.length > 140_000) {
    return NextResponse.json({ error: "This story sample is too large. Save the manuscript and try again." }, { status: 413 });
  }
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: `OpenAI is not configured for ${AI_WRITING_PARTNER_NAME} yet.` }, { status: 503 });
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

  const currentProfile = {
    ...profileFrom(manuscript.writing_profile),
    ...profileFrom(body.currentProfile),
  };
  const credit = await checkAndConsumeCredit(supabase, user.id, "story", id);
  if (!credit.ok) {
    return NextResponse.json({ error: credit.error, code: credit.code, remaining: credit.remaining, balance: credit }, { status: 402 });
  }

  try {
    const result = await mapStoryDirection({
      userId: user.id,
      title: manuscript.title,
      genre: manuscript.genre || "",
      synopsis: manuscript.synopsis || "",
      manuscriptExcerpt: body.documentExcerpt,
      currentProfile,
    });
    const { sourceSummary, ...profile } = result;
    return NextResponse.json({ profile, sourceSummary, remaining: credit.remaining });
  } catch (storyMapError) {
    return NextResponse.json(
      { error: storyMapError instanceof Error ? storyMapError.message : `${AI_WRITING_PARTNER_NAME} could not map this story right now.` },
      { status: 500 }
    );
  }
}
