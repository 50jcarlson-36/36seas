import type { SupabaseClient } from "@supabase/supabase-js";

export type IsbnFormat = "paperback" | "hardcover" | "ebook";

/**
 * Assigns the next available ISBN from the publisher-owned pool (see isbn_pool table).
 * Requires the pool to have been stocked by an admin via /dashboard/admin/isbns.
 * Returns null (not an error) if the pool has none available for that format — KDP's
 * free ISBN can be used as a fallback in that case.
 */
export async function assignIsbn(
  supabase: SupabaseClient,
  manuscriptId: string,
  format: IsbnFormat
): Promise<{ isbn13: string } | null> {
  const { data: available } = await supabase
    .from("isbn_pool")
    .select("id, isbn13")
    .eq("format", format)
    .eq("status", "available")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!available) return null;

  const { error } = await supabase
    .from("isbn_pool")
    .update({ status: "assigned", assigned_manuscript_id: manuscriptId, assigned_at: new Date().toISOString() })
    .eq("id", available.id)
    .eq("status", "available"); // guards against a race with another assignment

  if (error) return null;

  const column = format === "paperback" ? "isbn_paperback" : format === "hardcover" ? "isbn_hardcover" : "isbn_ebook";
  await supabase.from("manuscripts").update({ [column]: available.isbn13 }).eq("id", manuscriptId);

  return { isbn13: available.isbn13 };
}
