import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import StoryWorkspace from "@/components/StoryWorkspace";
import { getCreditBalance } from "@/lib/credits";

export default async function StoryDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: project } = await supabase.from("story_projects").select("*").eq("id", id).single();
  if (!project) notFound();

  const { data: chapters } = await supabase
    .from("story_chapters")
    .select("*")
    .eq("story_project_id", id)
    .order("chapter_number", { ascending: true });

  const credits = await getCreditBalance(supabase, user.id);

  return (
    <StoryWorkspace
      project={project}
      initialChapters={chapters || []}
      initialStoryCredits={credits.remaining.story + credits.extraRemaining}
    />
  );
}
