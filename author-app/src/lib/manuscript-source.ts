import type { SupabaseClient } from "@supabase/supabase-js";
import { extractManuscriptText } from "./manuscript-text";
import { bookChapters } from "./book-structure";

export async function loadManuscriptChapters(admin: SupabaseClient, manuscript: {
  file_path: string;
  editor_content?: string | null;
}) {
  let manuscriptText = "";
  if (!manuscript.editor_content?.trim()) {
    const { data, error } = await admin.storage.from("manuscripts").download(manuscript.file_path);
    if (error || !data) throw new Error(error?.message || "Could not download manuscript");
    manuscriptText = await extractManuscriptText(Buffer.from(await data.arrayBuffer()), manuscript.file_path);
  }
  return bookChapters({ editorContent: manuscript.editor_content, manuscriptText });
}
