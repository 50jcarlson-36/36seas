import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ALLOWED_BUCKETS = ["manuscripts", "covers", "exports"];

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { bucket, path } = await req.json();
  if (!ALLOWED_BUCKETS.includes(bucket) || !path) {
    return NextResponse.json({ error: "Invalid bucket or path" }, { status: 400 });
  }

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 15);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ url: data.signedUrl });
}
