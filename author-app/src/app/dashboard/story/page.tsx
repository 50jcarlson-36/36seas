import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import StoryIntakeForm from "@/components/StoryIntakeForm";

export default async function StoryListPage() {
  const supabase = await createClient();
  const { data: projects } = await supabase
    .from("story_projects")
    .select("id, title, genre, status, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Story builder</h1>
        <p className="mt-1 text-sm text-muted">
          Co-write a novel from scratch: outline, characters, then chapter by chapter.
        </p>
      </div>

      <StoryIntakeForm />

      <div className="divide-y divide-border rounded-lg border border-border bg-surface">
        {(projects || []).length === 0 && (
          <p className="p-6 text-sm text-muted">No stories started yet.</p>
        )}
        {(projects || []).map((p) => (
          <Link
            key={p.id}
            href={`/dashboard/story/${p.id}`}
            className="flex items-center justify-between p-4 text-sm hover:bg-surface-2"
          >
            <div>
              <p className="text-foreground">{p.title}</p>
              <p className="text-muted">{p.genre}</p>
            </div>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs uppercase tracking-wide text-accent">
              {p.status}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
