import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Claims any pending workspace invites addressed to the signed-in user's email.
// Called opportunistically from the dashboard layout since there's no email
// provider wired up to notify invitees — this is what makes the invite "activate"
// the moment the invited person logs in.
export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: pending } = await supabase
    .from("workspace_members")
    .select("id")
    .is("user_id", null)
    .eq("invited_email", user.email);

  if (!pending || pending.length === 0) return NextResponse.json({ claimed: 0 });

  for (const row of pending) {
    await supabase.from("workspace_members").update({ user_id: user.id, status: "active" }).eq("id", row.id);
  }

  return NextResponse.json({ claimed: pending.length });
}
