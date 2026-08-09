import { createClient } from "@/lib/supabase/server";
import ExpertServices from "@/components/ExpertServices";
import { asPlanKey } from "@/lib/services";

export default async function AssistancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: profile }, { data: manuscripts }] = await Promise.all([
    supabase.from("profiles").select("subscription_tier").eq("id", user!.id).single(),
    supabase
      .from("manuscripts")
      .select("id, title, word_count")
      .order("updated_at", { ascending: false }),
  ]);

  return (
    <div className="mx-auto max-w-6xl">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Author assistance</p>
      <h1 className="font-display mt-3 max-w-3xl text-3xl leading-tight sm:text-5xl">
        Get another set of eyes—or another pair of hands.
      </h1>
      <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
        Ask a publishing professional to evaluate your manuscript and clarify the next revision, or
        bring in a managed ghostwriter when you need help shaping and completing the work. 36Seas
        oversees the engagement, and paid members receive preferred rates.
      </p>
      <div className="mt-9">
        <ExpertServices tier={asPlanKey(profile?.subscription_tier)} manuscripts={manuscripts || []} />
      </div>
    </div>
  );
}
