import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_tier")
    .eq("id", user.id)
    .single();
  if (profile?.subscription_tier !== "publisher") {
    return NextResponse.json(
      { error: "Team workspaces are a Publisher-plan feature. Upgrade on the Plan & billing page." },
      { status: 403 }
    );
  }

  const { name } = await req.json();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name, owner_id: user.id })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await supabase.from("workspace_members").insert({
    workspace_id: workspace.id,
    user_id: user.id,
    invited_email: user.email,
    role: "owner",
    status: "active",
  });

  return NextResponse.json({ workspace });
}
