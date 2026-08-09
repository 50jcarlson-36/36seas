import type { BookChapter } from "./book-structure";

export const AUDIOBOOK_CHARACTERS_PER_CREDIT = 5000;

export function audiobookEstimate(chapters: BookChapter[]) {
  const characterCount = chapters.reduce((total, chapter) => total + chapter.body.length, 0);
  const wordCount = chapters.reduce((total, chapter) => total + chapter.body.trim().split(/\s+/).filter(Boolean).length, 0);
  return {
    characterCount,
    wordCount,
    chapterCount: chapters.length,
    credits: Math.max(1, Math.ceil(characterCount / AUDIOBOOK_CHARACTERS_PER_CREDIT)),
    estimatedMinutes: Math.max(1, Math.ceil(wordCount / 150)),
  };
}

export function narrationChunks(text: string, maxCharacters = 1800) {
  const paragraphs = text.split(/\n{2,}/).map((part) => part.trim()).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const paragraph of paragraphs) {
    if (current && current.length + paragraph.length + 2 > maxCharacters) {
      chunks.push(current);
      current = "";
    }
    if (paragraph.length <= maxCharacters) current += `${current ? "\n\n" : ""}${paragraph}`;
    else {
      const sentences = paragraph.match(/[^.!?]+[.!?]+|[^.!?]+$/g) || [paragraph];
      for (const sentence of sentences) {
        if (sentence.length > maxCharacters) {
          if (current) {
            chunks.push(current);
            current = "";
          }
          for (let offset = 0; offset < sentence.length; offset += maxCharacters) {
            chunks.push(sentence.slice(offset, offset + maxCharacters));
          }
          continue;
        }
        if (current && current.length + sentence.length > maxCharacters) {
          chunks.push(current);
          current = "";
        }
        current += sentence;
      }
    }
  }
  if (current) chunks.push(current);
  return chunks;
}
