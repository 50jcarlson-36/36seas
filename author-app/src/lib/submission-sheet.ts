import type { FullCoverSpec } from "./kdp-specs";

export function generateCutPasteSheet(opts: {
  title: string;
  subtitle?: string;
  author: string;
  description: string;
  keywords: string[];
  categories: string[];
  price: number | null;
  language?: string;
  pageCountInterior?: number;
  isbnPaperback?: string;
  isbnHardcover?: string;
  isbnEbook?: string;
  aiDisclosure: { text: boolean; images: boolean; translation: boolean };
  paperbackSpec?: FullCoverSpec;
  hardcoverSpec?: FullCoverSpec;
}): string {
  const line = (label: string, value: string) => `${label}:\n${value || "—"}\n`;
  const section = (title: string) => `\n${"=".repeat(3)} ${title} ${"=".repeat(3)}\n`;

  const parts: string[] = [];
  parts.push("36SEAS PUBLISHING — KDP SUBMISSION SHEET");
  parts.push(`Generated ${new Date().toLocaleString()}\n`);
  parts.push(
    "Each field below is ready to copy directly into the matching KDP field during Title Setup. " +
      "Verify spine widths against KDP's own calculator (kdp.amazon.com/cover-calculator) before final upload — " +
      "this sheet is a fast, reliable starting point, not a substitute for KDP's own check at the final page count."
  );

  parts.push(section("BOOK DETAILS"));
  parts.push(line("Title", opts.title));
  parts.push(line("Subtitle", opts.subtitle || ""));
  parts.push(line("Author", opts.author));
  parts.push(line("Language", opts.language || "English"));
  parts.push(line("Description (paste into 'Description' field)", opts.description));
  parts.push(line("Keywords (7 max — paste one per KDP keyword box)", opts.keywords.slice(0, 7).join(" | ")));
  parts.push(line("Categories / BISAC", opts.categories.join(" | ")));

  parts.push(section("PRICING"));
  parts.push(line("List price (USD)", opts.price != null ? `$${opts.price.toFixed(2)}` : ""));

  parts.push(section("ISBN"));
  parts.push(
    "If any field below is blank, use KDP's free ISBN for that format during Title Setup (Amazon assigns one automatically when you don't provide your own)."
  );
  parts.push(line("Paperback ISBN-13", opts.isbnPaperback || ""));
  parts.push(line("Hardcover ISBN-13", opts.isbnHardcover || ""));
  parts.push(line("eBook ISBN-13 (optional, Kindle doesn't require one)", opts.isbnEbook || ""));

  parts.push(section("AI CONTENT DISCLOSURE (KDP required checkbox, 2026+)"));
  parts.push(`Contains AI-generated text: ${opts.aiDisclosure.text ? "YES — check this box" : "No"}`);
  parts.push(`Contains AI-generated images: ${opts.aiDisclosure.images ? "YES — check this box" : "No"}`);
  parts.push(`Contains AI-generated translation: ${opts.aiDisclosure.translation ? "YES — check this box" : "No"}`);

  if (opts.pageCountInterior) {
    parts.push(section("INTERIOR"));
    parts.push(line("Page count (final formatted interior)", String(opts.pageCountInterior)));
  }

  for (const [label, spec] of [
    ["PAPERBACK COVER SPEC", opts.paperbackSpec] as const,
    ["HARDCOVER COVER SPEC", opts.hardcoverSpec] as const,
  ]) {
    if (!spec) continue;
    parts.push(section(label));
    parts.push(line("Trim size", `${spec.trimWidthIn}" x ${spec.trimHeightIn}"`));
    parts.push(line("Paper", spec.paperType));
    parts.push(line("Page count used for spine calc", String(spec.pageCount)));
    parts.push(line("Spine width", `${spec.spineWidthIn}"`));
    parts.push(
      line(
        spec.binding === "hardcover" ? "Wrap (all outer edges)" : "Bleed (all outer edges)",
        `${spec.bleedOrWrapIn}"`
      )
    );
    parts.push(line("Full cover file size (W x H)", `${spec.fullWidthIn}" x ${spec.fullHeightIn}"`));
    parts.push(line("Spine text allowed", spec.spineTextAllowed ? "Yes" : "No — under 79 pages"));
    if (spec.notes.length) parts.push(line("Notes", spec.notes.join(" ")));
  }

  parts.push(section("AMAZON SUBMISSION NOTE"));
  parts.push(
    "Amazon has no public API for automated book uploads. Go to kdp.amazon.com > Bookshelf > " +
      "Create > (Kindle eBook / Paperback / Hardcover), and paste the fields above into Title Setup manually."
  );

  return parts.join("\n");
}
