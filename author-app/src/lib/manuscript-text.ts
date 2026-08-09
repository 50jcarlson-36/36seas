import mammoth from "mammoth";

/** Extracts plain text from a manuscript buffer based on its mime/extension. */
export async function extractManuscriptText(
  buffer: Buffer,
  fileName: string
): Promise<string> {
  const ext = fileName.toLowerCase().split(".").pop();

  if (ext === "docx") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  if (ext === "txt" || ext === "md") {
    return buffer.toString("utf-8");
  }

  // Fallback: best-effort UTF-8 decode (covers plain-text-like formats).
  return buffer.toString("utf-8");
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function splitChapters(text: string): { heading: string; body: string }[] {
  const lines = text.split(/\r?\n/);
  const chapters: { heading: string; body: string }[] = [];
  let current: { heading: string; body: string[] } | null = null;
  const chapterRegex = /^(chapter|part|prologue|epilogue)\b/i;

  for (const line of lines) {
    if (chapterRegex.test(line.trim()) && line.trim().length < 80) {
      if (current) chapters.push({ heading: current.heading, body: current.body.join("\n") });
      current = { heading: line.trim(), body: [] };
    } else if (current) {
      current.body.push(line);
    } else {
      current = { heading: "Chapter 1", body: [line] };
    }
  }
  if (current) chapters.push({ heading: current.heading, body: current.body.join("\n") });
  return chapters.length ? chapters : [{ heading: "Manuscript", body: text }];
}
