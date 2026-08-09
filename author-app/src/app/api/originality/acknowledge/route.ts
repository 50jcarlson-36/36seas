import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { checkId } = await req.json();
  const admin = createServiceRoleClient();
  const { data, error } = await admin.from("originality_checks")
    .update({ acknowledged_at: new Date().toISOString() })
    .eq("id", checkId).eq("user_id", user.id).eq("status", "flagged").select().maybeSingle();
  if (error || !data) return NextResponse.json({ error: error?.message || "Check not found" }, { status: 404 });
  return NextResponse.json({ check: data });
}
