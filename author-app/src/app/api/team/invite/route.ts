import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendWorkspaceInviteEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { workspaceId, email, role } = await req.json();
  if (!workspaceId || !email) {
    return NextResponse.json({ error: "workspaceId and email required" }, { status: 400 });
  }

  const normalizedEmail = email.trim().toLowerCase();
  const memberRole = role === "viewer" ? "viewer" : "editor";

  const { data, error } = await supabase
    .from("workspace_members")
    .insert({
      workspace_id: workspaceId,
      invited_email: normalizedEmail,
      role: memberRole,
      status: "invited",
    })
    .select()
    .single();

  if (error) {
    const message = error.code === "23505" ? "That email is already invited to this workspace." : error.message;
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const [{ data: workspace }, { data: inviterProfile }] = await Promise.all([
    supabase.from("workspaces").select("name").eq("id", workspaceId).single(),
    supabase.from("profiles").select("full_name, pen_name, email").eq("id", user.id).single(),
  ]);

  const inviterName = inviterProfile?.pen_name || inviterProfile?.full_name || inviterProfile?.email || "A teammate";

  const emailResult = await sendWorkspaceInviteEmail({
    to: normalizedEmail,
    workspaceName: workspace?.name || "a 36Seas workspace",
    inviterName,
    role: memberRole,
  });

  return NextResponse.json({
    member: data,
    note: emailResult.sent
      ? `Invite email sent to ${normalizedEmail}.`
      : `Couldn't send the invite email (${emailResult.error}). They'll still see the workspace as soon as they log in with this email address — share the sign-up link with them directly in the meantime.`,
  });
}
