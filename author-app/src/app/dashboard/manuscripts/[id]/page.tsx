import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ManuscriptWorkspace from "@/components/ManuscriptWorkspace";
import { getCreditBalance } from "@/lib/credits";

export default async function ManuscriptDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: manuscript } = await supabase.from("manuscripts").select("*").eq("id", id).single();
  if (!manuscript) notFound();

  const { data: profile } = await supabase
    .from("profiles")
    .select("pen_name, full_name, subscription_tier")
    .eq("id", user!.id)
    .single();
  const authorName = profile?.pen_name || profile?.full_name || "";
  const creditBalance = await getCreditBalance(supabase, user.id);

  const [{ data: reviews }, { data: covers }, { data: formats }, { data: packages }] = await Promise.all([
    supabase
      .from("ai_reviews")
      .select("*")
      .eq("manuscript_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("covers")
      .select("*")
      .eq("manuscript_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("formatting_jobs")
      .select("*")
      .eq("manuscript_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("submission_packages")
      .select("*")
      .eq("manuscript_id", id)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <ManuscriptWorkspace
      manuscript={manuscript}
      authorName={authorName}
      subscriptionTier={profile?.subscription_tier || "free"}
      initialStoryCredits={creditBalance.remaining.story + creditBalance.extraRemaining}
      initialReviews={reviews || []}
      initialCovers={covers || []}
      initialFormats={formats || []}
      initialPackages={packages || []}
    />
  );
}
