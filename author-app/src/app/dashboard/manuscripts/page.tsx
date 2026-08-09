import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import UploadManuscriptForm from "@/components/UploadManuscriptForm";

export default async function ManuscriptsPage() {
  const supabase = await createClient();
  const { data: manuscripts } = await supabase
    .from("manuscripts")
    .select("id, title, genre, status, word_count, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl">Manuscripts</h1>
        <p className="mt-1 text-sm text-muted">Upload a new draft or continue work on an existing one.</p>
      </div>

      <div id="upload" className="scroll-mt-8">
        <UploadManuscriptForm />
      </div>

      <div className="divide-y divide-border rounded-lg border border-border bg-surface">
        {(manuscripts || []).length === 0 && (
          <p className="p-6 text-sm text-muted">Nothing uploaded yet.</p>
        )}
        {(manuscripts || []).map((m) => (
          <Link
            key={m.id}
            href={`/dashboard/manuscripts/${m.id}`}
            className="flex items-center justify-between p-4 text-sm hover:bg-surface-2"
          >
            <div>
              <p className="text-foreground">{m.title}</p>
              <p className="text-muted">
                {m.genre || "—"} · {m.word_count ? `${m.word_count.toLocaleString()} words` : "—"}
              </p>
            </div>
            <span className="rounded-full bg-surface-2 px-3 py-1 text-xs uppercase tracking-wide text-accent">
              {m.status.replace("_", " ")}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
