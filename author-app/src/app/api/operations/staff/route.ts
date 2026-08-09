import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getOperationsActor, recordOperationsEvent } from "@/lib/operations";

const Input = z.object({
  profileId: z.string().uuid(),
  role: z.enum(["member", "worker", "manager", "admin"]),
});

export async function POST(req: NextRequest) {
  const actor = await getOperationsActor();
  if (!actor?.isAdmin) return NextResponse.json({ error: "Administrator access required." }, { status: 403 });

  const parsed = Input.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid staff role." }, { status: 400 });
  if (parsed.data.profileId === actor.user.id && parsed.data.role !== "admin") {
    return NextResponse.json({ error: "You cannot remove your own administrator access." }, { status: 400 });
  }

  const { data, error } = await actor.service
    .from("profiles")
    .update({ role: parsed.data.role })
    .eq("id", parsed.data.profileId)
    .select("id, email, full_name, role")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await recordOperationsEvent({
    actorId: actor.user.id,
    action: "staff.role_changed",
    details: { profileId: data.id, role: data.role },
  });
  return NextResponse.json({ profile: data });
}
