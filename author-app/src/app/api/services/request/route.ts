import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { asPlanKey, GHOSTWRITING_DISCOUNTS } from "@/lib/services";
import { sendGhostwritingRequestEmail } from "@/lib/email";

const requestSchema = z.object({
  manuscriptId: z.string().uuid().nullable().optional(),
  genre: z.string().trim().max(120).optional().default(""),
  targetWordCount: z.coerce.number().int().min(10000).max(200000),
  brief: z.string().trim().min(40).max(5000),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const parsed = requestSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || "Complete the project brief." },
      { status: 400 }
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier, full_name")
    .eq("id", user.id)
    .single();
  const tier = asPlanKey(profile?.subscription_tier);

  if (parsed.data.manuscriptId) {
    const { data: manuscript } = await supabase
      .from("manuscripts")
      .select("id")
      .eq("id", parsed.data.manuscriptId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!manuscript) return NextResponse.json({ error: "Manuscript not found." }, { status: 404 });
  }

  const serviceRole = createServiceRoleClient();
  const { data: request, error } = await serviceRole
    .from("service_requests")
    .insert({
      user_id: user.id,
      manuscript_id: parsed.data.manuscriptId || null,
      service_type: "managed_ghostwriting",
      member_tier: tier,
      discount_percent: GHOSTWRITING_DISCOUNTS[tier],
      genre: parsed.data.genre,
      target_word_count: parsed.data.targetWordCount,
      brief: parsed.data.brief,
      status: "new",
    })
    .select("id")
    .single();
  if (error || !request) {
    return NextResponse.json({ error: error?.message || "Could not submit request." }, { status: 500 });
  }

  await sendGhostwritingRequestEmail({
    to: user.email || "",
    authorName: profile?.full_name || user.email || "36Seas author",
    requestId: request.id,
    targetWordCount: parsed.data.targetWordCount,
    genre: parsed.data.genre,
    memberTier: tier,
    discountPercent: GHOSTWRITING_DISCOUNTS[tier],
    brief: parsed.data.brief,
  });

  return NextResponse.json({ requestId: request.id });
}
