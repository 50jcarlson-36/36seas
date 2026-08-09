import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { loadManuscriptChapters } from "@/lib/manuscript-source";
import { loadOriginalityGate } from "@/lib/originality";
import { ORIGINALITY_OWNERSHIP_CLAUSE, ORIGINALITY_TERMS_VERSION } from "@/lib/legal";

export async function GET(req: NextRequest) {
  const manuscriptId = req.nextUrl.searchParams.get("manuscriptId");
  if (!manuscriptId) return NextResponse.json({ error: "manuscriptId required" }, { status: 400 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const admin = createServiceRoleClient();
  const { data: manuscript } = await admin.from("manuscripts")
    .select("id,user_id,file_path,editor_content")
    .eq("id", manuscriptId).eq("user_id", user.id).single();
  if (!manuscript) return NextResponse.json({ error: "Manuscript not found" }, { status: 404 });

  const [chapters, acceptance] = await Promise.all([
    loadManuscriptChapters(admin, manuscript),
    admin.from("legal_acceptances").select("accepted_at")
      .eq("user_id", user.id).eq("document_type", "terms_and_originality")
      .eq("document_version", ORIGINALITY_TERMS_VERSION).maybeSingle(),
  ]);
  const gate = await loadOriginalityGate(admin, manuscriptId, chapters);
  return NextResponse.json({ ...gate, legalAccepted: !!acceptance.data, clause: ORIGINALITY_OWNERSHIP_CLAUSE });
}
