import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type TypecastVoice = {
  voice_id: string;
  voice_name: string;
  gender?: string | null;
  age?: string | null;
  use_cases?: string[];
  models?: Array<{ version: string; emotions?: string[] }>;
};

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  if (!process.env.TYPECAST_API_TOKEN) {
    return NextResponse.json({
      voices: [],
      configured: false,
      message: "The licensed narrator catalog will appear after the Typecast API account is connected.",
    });
  }

  const response = await fetch("https://api.typecast.ai/v2/voices?model=ssfm-v30", {
    headers: { "X-API-KEY": process.env.TYPECAST_API_TOKEN },
    next: { revalidate: 60 * 60 },
  });
  if (!response.ok) {
    return NextResponse.json({ error: "The narrator catalog is temporarily unavailable." }, { status: 502 });
  }

  const providerVoices = await response.json() as TypecastVoice[];
  const voices = providerVoices
    .filter((voice) =>
      voice.models?.some((model) => model.version === "ssfm-v30") &&
      (!voice.use_cases?.length || voice.use_cases.some((useCase) => useCase.toLowerCase() === "audiobook"))
    )
    .map((voice) => ({
      id: voice.voice_id,
      name: voice.voice_name,
      gender: voice.gender || "unspecified",
      age: voice.age || "unspecified",
      emotions: voice.models?.find((model) => model.version === "ssfm-v30")?.emotions || [],
    }));

  return NextResponse.json({ voices, configured: true });
}
