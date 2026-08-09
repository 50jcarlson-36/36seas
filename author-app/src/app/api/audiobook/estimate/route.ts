import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { loadManuscriptChapters } from "@/lib/manuscript-source";
import { audiobookEstimate } from "@/lib/audiobook";

export async function GET(req: NextRequest) {
  const manuscriptId = req.nextUrl.searchParams.get("manuscriptId");
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!manuscriptId) return NextResponse.json({ error: "manuscriptId required" }, { status: 400 });
  const admin = createServiceRoleClient();
  const { data: manuscript } = await admin.from("manuscripts").select("id,user_id,file_path,editor_content")
    .eq("id", manuscriptId).eq("user_id", user.id).single();
  if (!manuscript) return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });
  const chapters = await loadManuscriptChapters(admin, manuscript);
  return NextResponse.json({
    ...audiobookEstimate(chapters),
    provider: "Typecast",
    productionEnabled: process.env.TYPECAST_COMMERCIAL_REDISTRIBUTION_APPROVED === "true" && !!process.env.TYPECAST_API_TOKEN,
  });
}

