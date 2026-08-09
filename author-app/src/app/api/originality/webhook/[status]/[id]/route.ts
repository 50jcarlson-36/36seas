import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { originalityWebhookAuthorized, requestCopyleaksResultExport } from "@/lib/copyleaks";

type Source = { id?: string | number; title?: string; url?: string; matchedWords?: number };

export async function POST(req: NextRequest, context: { params: Promise<{ status: string; id: string }> }) {
  const { status, id } = await context.params;
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  if (!originalityWebhookAuthorized(req, body)) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });

  const admin = createServiceRoleClient();
  if (status === "error") {
    await admin.from("originality_checks").update({ status: "failed", error: "The originality provider could not complete this scan." }).eq("id", id);
    return NextResponse.json({ received: true });
  }
  if (status !== "completed") return NextResponse.json({ received: true });

  const results = (body.results || {}) as Record<string, unknown>;
  const score = (results.score || {}) as Record<string, unknown>;
  const similarity = Number(score.aggregatedScore || 0);
  const sources = [
    ...(((results.internet || []) as Source[])),
    ...(((results.database || []) as Source[])),
    ...(((results.repositories || []) as Source[])),
  ];
  const threshold = Number(process.env.ORIGINALITY_PASS_THRESHOLD || 15);
  const hasDetailedResults = sources.some((source) => source.id !== undefined && source.id !== null);
  const summaryMatches = sources.map((source) => ({
    providerResultId: source.id === undefined || source.id === null ? undefined : String(source.id),
    title: source.title || "Matched source",
    url: source.url,
    matchedWords: source.matchedWords,
    passages: [],
  }));
  await admin.from("originality_checks").update({
    status: hasDetailedResults ? "running" : similarity <= threshold ? "passed" : "flagged",
    similarity_percent: Math.max(0, Math.min(100, similarity)),
    matches: summaryMatches,
    error: null,
  }).eq("id", id);

  if (hasDetailedResults) {
    try {
      await requestCopyleaksResultExport({ scanId: id, results: sources });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not retrieve detailed originality results.";
      await admin.from("originality_checks").update({ status: "failed", error: message }).eq("id", id);
      return NextResponse.json({ error: message }, { status: 502 });
    }
  }
  return NextResponse.json({ received: true });
}
