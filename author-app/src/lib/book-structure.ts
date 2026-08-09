import { createHash } from "crypto";
import { splitChapters } from "./manuscript-text";

export type BookChapter = {
  index: number;
  title: string;
  body: string;
  contentHash: string;
};

export function bookChapters(source: { editorContent?: string | null; manuscriptText?: string | null }): BookChapter[] {
  const fromEditor = source.editorContent ? chaptersFromHtml(source.editorContent) : [];
  const raw = fromEditor.length
    ? fromEditor
    : splitChapters(source.manuscriptText || "").map((chapter) => ({ title: chapter.heading, body: chapter.body }));

  return raw
    .map((chapter, index) => ({
      index,
      title: chapter.title.trim() || `Chapter ${index + 1}`,
      body: chapter.body.trim(),
      contentHash: chapterHash(chapter.title, chapter.body),
    }))
    .filter((chapter) => chapter.body || chapter.title);
}

export function plainTextFromEditorHtml(html: string) {
  return decodeHtml(
    html
      .replace(/<\/(p|div|h1|h2|h3|blockquote|li)>/gi, "\n\n")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function chapterHash(title: string, body: string) {
  return createHash("sha256")
    .update(`${normalize(title)}\n${normalize(body)}`)
    .digest("hex");
}

function chaptersFromHtml(html: string): Array<{ title: string; body: string }> {
  const normalized = html
    .replace(/<h1\b[^>]*>/gi, "\n\n§§CHAPTER§§")
    .replace(/<\/h1>/gi, "§§BODY§§\n\n")
    .replace(/<h2\b[^>]*>/gi, "\n\n§§CHAPTER§§")
    .replace(/<\/h2>/gi, "§§BODY§§\n\n");
  const parts = normalized.split("§§CHAPTER§§");
  const chapters: Array<{ title: string; body: string }> = [];
  const preface = plainTextFromEditorHtml(parts.shift() || "");
  if (preface) chapters.push({ title: "Introduction", body: preface });

  for (const part of parts) {
    const marker = part.indexOf("§§BODY§§");
    if (marker < 0) continue;
    const title = plainTextFromEditorHtml(part.slice(0, marker));
    const body = plainTextFromEditorHtml(part.slice(marker + "§§BODY§§".length));
    chapters.push({ title, body });
  }

  if (chapters.length === 0) {
    const text = plainTextFromEditorHtml(html);
    if (text) chapters.push({ title: "Manuscript", body: text });
  }
  return chapters;
}

function normalize(value: string) {
  return value.replace(/\s+/g, " ").trim().normalize("NFKC");
}

function decodeHtml(value: string) {
  const entities: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: " ",
  };
  return value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (_, entity: string) => {
    if (entity[0] === "#") {
      const hex = entity[1]?.toLowerCase() === "x";
      const code = Number.parseInt(entity.slice(hex ? 2 : 1), hex ? 16 : 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : "";
    }
    return entities[entity.toLowerCase()] ?? `&${entity};`;
  });
}
