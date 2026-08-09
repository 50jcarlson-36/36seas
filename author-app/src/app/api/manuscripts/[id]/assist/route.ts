import { NextRequest, NextResponse } from "next/server";
import { assistManuscript, type ManuscriptAssistAction } from "@/lib/anthropic";
import { checkAndConsumeCredit } from "@/lib/credits";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

type RouteContext = { params: Promise<{ id: string }> };
const ACTIONS = new Set<ManuscriptAssistAction>([
  "improve",
  "shorten",
  "expand",
  "grammar",
  "simplify",
  "continue",
]);

export async function POST(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createServiceRoleClient();

  const body = (await req.json().catch(() => null)) as {
    action?: unknown;
    selection?: unknown;
    contextBefore?: unknown;
    contextAfter?: unknown;
    profile?: unknown;
  } | null;

  if (!body || typeof body.action !== "string" || !ACTIONS.has(body.action as ManuscriptAssistAction)) {
    return NextResponse.json({ error: "Choose a valid editing action." }, { status: 400 });
  }
  if (typeof body.selection !== "string" || !body.selection.trim()) {
    return NextResponse.json({ error: "Select a passage first." }, { status: 400 });
  }
  if (body.selection.length > 20_000) {
    return NextResponse.json({ error: "Select a shorter passage (about 3,000 words or less)." }, { status: 413 });
  }

  const { data: manuscript, error: manuscriptError } = await admin
    .from("manuscripts")
    .select("id, title, genre")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (manuscriptError || !manuscript) {
    return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });
  }

  const credit = await checkAndConsumeCredit(supabase, user.id, "story", id);
  if (!credit.ok) {
    return NextResponse.json({ error: credit.error, code: credit.code, remaining: credit.remaining, balance: credit }, { status: 402 });
  }

  try {
    const suggestion = await assistManuscript({
      action: body.action as ManuscriptAssistAction,
      title: manuscript.title,
      genre: manuscript.genre || "",
      selection: body.selection,
      contextBefore: typeof body.contextBefore === "string" ? body.contextBefore.slice(-3000) : "",
      contextAfter: typeof body.contextAfter === "string" ? body.contextAfter.slice(0, 3000) : "",
      profile: body.profile && typeof body.profile === "object" && !Array.isArray(body.profile)
        ? body.profile as Record<string, string>
        : undefined,
    });
    return NextResponse.json({ suggestion, remaining: credit.remaining });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "AI editing is temporarily unavailable." },
      { status: 500 }
    );
  }
}
