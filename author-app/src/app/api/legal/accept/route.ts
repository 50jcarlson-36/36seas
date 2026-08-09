import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { ORIGINALITY_TERMS_HASH, ORIGINALITY_TERMS_VERSION } from "@/lib/legal";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const admin = createServiceRoleClient();
  const { error } = await admin.from("legal_acceptances").upsert({
    user_id: user.id,
    document_type: "terms_and_originality",
    document_version: ORIGINALITY_TERMS_VERSION,
    clause_hash: ORIGINALITY_TERMS_HASH,
    accepted_at: new Date().toISOString(),
    acceptance_source: "publish_gate",
  }, { onConflict: "user_id,document_type,document_version" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ accepted: true, version: ORIGINALITY_TERMS_VERSION });
}
