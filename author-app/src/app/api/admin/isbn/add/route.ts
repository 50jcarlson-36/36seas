import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { effectiveRole } from "@/lib/access";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (effectiveRole(user.email, profile?.role) !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { isbns, format } = await req.json();
  if (!Array.isArray(isbns) || isbns.length === 0 || !format) {
    return NextResponse.json({ error: "isbns[] and format required" }, { status: 400 });
  }

  const rows = isbns
    .map((s: string) => s.replace(/[^0-9Xx]/g, ""))
    .filter((s: string) => s.length === 13)
    .map((isbn13: string) => ({ isbn13, format, added_by: user.id }));

  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid 13-digit ISBNs found" }, { status: 400 });
  }

  const { error, count } = await supabase.from("isbn_pool").insert(rows, { count: "exact" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ added: count ?? rows.length });
}
