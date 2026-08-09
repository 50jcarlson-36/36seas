import nodepub from "nodepub";
import PDFDocument from "pdfkit";
import {
  AlignmentType,
  Document,
  Footer,
  HeadingLevel,
  PageBreak,
  PageNumber,
  Packer,
  Paragraph,
  TableOfContents,
  TextRun,
} from "docx";
import { promises as fs } from "fs";
import os from "os";
import path from "path";
import { splitChapters } from "./manuscript-text";
import type { BookChapter } from "./book-structure";
import { TRIM_SIZES } from "./kdp-specs";

const TRIM_SIZES_PT: Record<string, [number, number]> = Object.fromEntries(
  Object.entries(TRIM_SIZES).map(([k, [w, h]]) => [k, [w * 72, h * 72]])
);

export async function generateEpub(opts: {
  title: string;
  author: string;
  genre?: string;
  description?: string;
  manuscriptText: string;
  chapters?: BookChapter[];
  coverBuffer?: Buffer;
  coverExt?: string; // "png" | "jpg" | "svg"
  copyrightPageText?: string;
}): Promise<Buffer> {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "36seas-epub-"));
  let coverPath: string | undefined;

  if (opts.coverBuffer && opts.coverExt) {
    coverPath = path.join(tmpDir, `cover.${opts.coverExt}`);
    await fs.writeFile(coverPath, opts.coverBuffer);
  }

  const metadata = {
    id: `36seas-${Date.now()}`,
    title: opts.title,
    author: opts.author || "Unknown Author",
    fileAs: opts.author || "Unknown Author",
    genre: opts.genre || "Fiction",
    tags: opts.genre || "",
    publisher: "36Seas Publishing",
    published: new Date().toISOString().slice(0, 10),
    language: "en",
    description: opts.description || "",
    cover: coverPath,
    showContents: true,
    contents: "Table of Contents",
  };

  const epub = nodepub.document(metadata as never);
  epub.addCSS(
    `body { font-family: Georgia, serif; line-height: 1.5; } h1 { font-family: Georgia, serif; } .copyright { font-size: 0.85em; }`
  );

  if (opts.copyrightPageText) {
    const html = `<div class="copyright">${opts.copyrightPageText
      .split(/\n{2,}/)
      .filter((p) => p.trim())
      .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
      .join("\n")}</div>`;
    epub.addSection("Copyright", html, true, true);
  }

  const chapters = opts.chapters || splitChapters(opts.manuscriptText).map((chapter, index) => ({
    index,
    title: chapter.heading,
    body: chapter.body,
    contentHash: "",
  }));
  for (const chapter of chapters) {
    const html = `<h1>${escapeHtml(chapter.title)}</h1>` +
      chapter.body
        .split(/\n{2,}/)
        .filter((p) => p.trim())
        .map((p) => `<p>${escapeHtml(p.trim())}</p>`)
        .join("\n");
    epub.addSection(chapter.title, html);
  }

  const outDir = await fs.mkdtemp(path.join(os.tmpdir(), "36seas-epub-out-"));
  await epub.writeEPUB(outDir, "manuscript");
  const buffer = await fs.readFile(path.join(outDir, "manuscript.epub"));

  await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  await fs.rm(outDir, { recursive: true, force: true }).catch(() => {});

  return buffer;
}

export function generatePrintPdf(opts: {
  title: string;
  author: string;
  manuscriptText: string;
  chapters?: BookChapter[];
  trimSize?: string;
  copyrightPageText?: string;
}): Promise<{ buffer: Buffer; pageCount: number }> {
  const [width, height] = TRIM_SIZES_PT[opts.trimSize || "6x9"] || TRIM_SIZES_PT["6x9"];
  const margin = 0.75 * 72;

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [width, height], margin, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("error", reject);

    // Title page
    doc.font("Times-Bold").fontSize(28).text(opts.title, { align: "center" });
    doc.moveDown(2);
    doc.font("Times-Roman").fontSize(16).text(`by ${opts.author || "Unknown Author"}`, {
      align: "center",
    });
    doc.moveDown(6);
    doc.fontSize(10).fillColor("#666").text("36Seas Publishing", { align: "center" });

    if (opts.copyrightPageText) {
      doc.addPage();
      doc.font("Times-Roman").fontSize(9.5).fillColor("#333").text(opts.copyrightPageText, {
        align: "left",
        lineGap: 2,
      });
    }

    const chapters = opts.chapters || splitChapters(opts.manuscriptText).map((chapter, index) => ({
      index,
      title: chapter.heading,
      body: chapter.body,
      contentHash: "",
    }));
    const tocPageCount = Math.max(1, Math.ceil(chapters.length / 28));
    const tocPages: number[] = [];
    for (let i = 0; i < tocPageCount; i++) {
      doc.addPage();
      tocPages.push(doc.bufferedPageRange().count - 1);
    }
    const chapterPages: Array<{ title: string; page: number }> = [];
    for (const chapter of chapters) {
      doc.addPage();
      chapterPages.push({ title: chapter.title, page: doc.bufferedPageRange().count });
      doc.font("Times-Bold").fontSize(20).fillColor("#000").text(chapter.title);
      doc.moveDown(1);
      doc.font("Times-Roman").fontSize(11.5).text(chapter.body.trim(), {
        align: "justify",
        lineGap: 3,
      });
    }

    chapterPages.forEach((entry, index) => {
      const pageSlot = Math.floor(index / 28);
      const line = index % 28;
      doc.switchToPage(tocPages[pageSlot]);
      if (line === 0) {
        doc.font("Times-Bold").fontSize(20).fillColor("#000").text("Table of Contents", margin, margin);
      }
      const y = margin + 42 + line * 16;
      doc.font("Times-Roman").fontSize(10.5).fillColor("#111").text(entry.title, margin, y, {
        width: width - margin * 2 - 40,
        ellipsis: true,
      });
      doc.text(String(entry.page), width - margin - 36, y, { width: 36, align: "right" });
    });

    // Page numbers on every page after the title page.
    const range = doc.bufferedPageRange();
    for (let i = range.start + 1; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc
        .font("Times-Roman")
        .fontSize(9)
        .fillColor("#888")
        .text(String(i - range.start + 1), 0, height - margin / 2, {
          width,
          align: "center",
        });
    }

    doc.on("end", () => resolve({ buffer: Buffer.concat(chunks), pageCount: range.count }));
    doc.end();
  });
}

export async function generateDocx(opts: {
  title: string;
  author: string;
  chapters: BookChapter[];
  copyrightPageText?: string;
}): Promise<Buffer> {
  const children: Array<Paragraph | TableOfContents> = [
    new Paragraph({
      text: opts.title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 360 },
    }),
    new Paragraph({
      children: [new TextRun({ text: `by ${opts.author || "Unknown Author"}`, italics: true })],
      alignment: AlignmentType.CENTER,
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];

  if (opts.copyrightPageText) {
    children.push(
      ...opts.copyrightPageText.split(/\n{2,}/).filter(Boolean).map((text) => new Paragraph({ text })),
      new Paragraph({ children: [new PageBreak()] })
    );
  }

  children.push(
    new Paragraph({ text: "Table of Contents", heading: HeadingLevel.HEADING_1 }),
    new TableOfContents("Table of Contents", { hyperlink: true, headingStyleRange: "1-2" }),
    new Paragraph({ children: [new PageBreak()] })
  );

  opts.chapters.forEach((chapter, index) => {
    children.push(new Paragraph({ text: chapter.title, heading: HeadingLevel.HEADING_1 }));
    for (const paragraph of chapter.body.split(/\n{2,}/).filter((value) => value.trim())) {
      children.push(new Paragraph({ text: paragraph.trim(), spacing: { after: 180 }, alignment: AlignmentType.JUSTIFIED }));
    }
    if (index < opts.chapters.length - 1) children.push(new Paragraph({ children: [new PageBreak()] }));
  });

  const doc = new Document({
    creator: opts.author,
    title: opts.title,
    description: "36Seas Publishing editable manuscript export",
    sections: [{
      properties: {},
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [new TextRun({ children: [PageNumber.CURRENT] })],
          })],
        }),
      },
      children,
    }],
  });
  return Buffer.from(await Packer.toBuffer(doc));
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
