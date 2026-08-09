import PDFDocument from "pdfkit";
import { computeFullCoverSpec, type Binding, type PaperType, type FullCoverSpec } from "./kdp-specs";
import type { CoverBrief } from "./cover-art";

const IN = 72; // points per inch

export async function generateFullWrapCoverPdf(opts: {
  binding: Binding;
  trimSize: string;
  pageCount: number;
  paperType: PaperType;
  title: string;
  subtitle?: string;
  author: string;
  blurb?: string;
  brief: CoverBrief;
  frontCoverImage?: { buffer: Buffer; mime: string };
}): Promise<{ buffer: Buffer; spec: FullCoverSpec }> {
  const spec = computeFullCoverSpec(opts.binding, opts.trimSize, opts.pageCount, opts.paperType);

  const fullWPt = spec.fullWidthIn * IN;
  const fullHPt = spec.fullHeightIn * IN;
  const bleedPt = spec.bleedOrWrapIn * IN;
  const trimWPt = spec.trimWidthIn * IN;
  const spinePt = spec.spineWidthIn * IN;

  const backX = 0;
  const backW = bleedPt + trimWPt;
  const spineX = backW;
  const frontX = spineX + spinePt;
  const frontW = trimWPt + bleedPt;

  const [bg, accent, ink] = spec.binding === "hardcover" ? [opts.brief.colors[0], opts.brief.colors[1], opts.brief.colors[2]] : opts.brief.colors;

  const buffer: Buffer = await new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: [fullWPt, fullHPt], margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    // Full bleed background
    doc.rect(0, 0, fullWPt, fullHPt).fill(bg);

    function drawWaveMark(x: number, y: number, width: number, color: string) {
      const scale = width / 220;
      doc.save().translate(x, y).scale(scale);
      doc
        .lineCap("round")
        .lineJoin("round")
        .strokeColor(color)
        .lineWidth(8)
        .path("M10 70C42 65 48 19 91 14c-22 8-33 34-32 56")
        .stroke();
      doc
        .lineWidth(7)
        .path("M37 70C61 59 64 25 98 18c-17 10-23 30-18 52")
        .stroke();
      doc
        .path("M67 70C83 56 82 34 108 24c-11 11-12 29-3 43 13 19 36 15 49 4 18-15 38-11 56 2-22-8-37-1-49 7-22 15-52 14-72-10")
        .stroke();
      doc.restore();
    }

    // --- Back cover ---
    const safeInsetPt = (opts.binding === "hardcover" ? 0.635 : 0.25) * IN;
    doc.fillColor(accent).font("Helvetica-Bold").fontSize(7.5).text(
      "STORIES WORTH CROSSING OCEANS FOR",
      backX + safeInsetPt,
      safeInsetPt,
      { width: backW - safeInsetPt * 2, characterSpacing: 1.5 }
    );
    doc
      .moveTo(backX + safeInsetPt, safeInsetPt + 16)
      .lineTo(backX + backW - safeInsetPt, safeInsetPt + 16)
      .strokeColor(accent)
      .opacity(0.55)
      .lineWidth(0.6)
      .stroke()
      .opacity(1);
    if (opts.blurb) {
      doc
        .font("Times-Roman")
        .fontSize(10.5)
        .fillColor(ink)
        .text(opts.blurb, backX + safeInsetPt, safeInsetPt + 40, {
          width: backW - safeInsetPt * 2,
          height: fullHPt - safeInsetPt * 2 - 145,
          align: "left",
          lineGap: 3,
        });
    }
    // Barcode safe zone (Amazon places one automatically if you don't supply your own)
    const bcW = 2.25 * IN;
    const bcH = 1.35 * IN;
    const bcX = backX + backW - safeInsetPt - bcW;
    const bcY = fullHPt - safeInsetPt - bcH;
    doc
      .save()
      .dash(3, { space: 2 })
      .rect(bcX, bcY, bcW, bcH)
      .strokeColor(ink)
      .lineWidth(0.75)
      .stroke()
      .undash()
      .restore();
    doc
      .fontSize(6.5)
      .fillColor(ink)
      .text("Amazon barcode area — leave clear", bcX, bcY + bcH / 2 - 4, {
        width: bcW,
        align: "center",
      });

    const imprintY = fullHPt - safeInsetPt - 54;
    drawWaveMark(backX + safeInsetPt, imprintY - 10, 42, accent);
    doc
      .font("Helvetica-Bold")
      .fontSize(8)
      .fillColor(ink)
      .text("36SEAS PUBLISHING", backX + safeInsetPt + 48, imprintY, { characterSpacing: 0.8 });
    doc
      .font("Helvetica")
      .fontSize(6.5)
      .fillColor(accent)
      .text("36SEAS.COM", backX + safeInsetPt + 48, imprintY + 13, { characterSpacing: 1.2 });

    // --- Spine ---
    doc.rect(spineX, 0, spinePt, fullHPt).fill(bg);
    doc.rect(spineX, 0, Math.min(1.5, spinePt / 5), fullHPt).fill(accent);
    doc.rect(spineX + spinePt - Math.min(1.5, spinePt / 5), 0, Math.min(1.5, spinePt / 5), fullHPt).fill(accent);
    if (spec.spineTextAllowed && spinePt > 14) {
      const cx = spineX + spinePt / 2;
      const cy = fullHPt / 2;
      doc.save();
      doc.rotate(-90, { origin: [cx, cy] });
      const spineFontSize = Math.min(16, Math.max(8, spinePt - 6));
      doc
        .font("Times-Bold")
        .fontSize(spineFontSize)
        .fillColor(ink)
        .text(`${opts.title.toUpperCase()}  •  ${opts.author.toUpperCase()}`, cx - fullHPt / 2 + 38, cy - spinePt / 2 + 2, {
          width: fullHPt - 48,
          align: "center",
          characterSpacing: 0.6,
        });
      doc.restore();
    }

    // --- Front cover ---
    let usedFrontImage = false;
    if (opts.frontCoverImage && /png|jpe?g/.test(opts.frontCoverImage.mime)) {
      try {
        doc.image(opts.frontCoverImage.buffer, frontX, 0, { width: frontW, height: fullHPt });
        usedFrontImage = true;
      } catch {
        drawGenerativeFront();
      }
    } else {
      drawGenerativeFront();
    }

    if (usedFrontImage) drawFrontTypography();

    function drawFrontTypography() {
      doc.save();
      doc
        .fillColor("#000000")
        .opacity(0.42)
        .rect(frontX, 0, frontW, fullHPt * 0.43)
        .fill();
      doc
        .rect(frontX, fullHPt * 0.77, frontW, fullHPt * 0.23)
        .fill();
      doc.opacity(1);
      doc
        .fillColor("#ffffff")
        .font("Times-Bold")
        .fontSize(Math.min(40, frontW / 7))
        .text(opts.title, frontX + safeInsetPt, safeInsetPt + 18, {
          width: frontW - safeInsetPt * 2,
          align: "left",
          lineGap: -2,
        });
      if (opts.subtitle) {
        doc
          .font("Helvetica")
          .fontSize(10)
          .fillColor("#f2eadb")
          .text(opts.subtitle, frontX + safeInsetPt, fullHPt * 0.33, {
            width: frontW - safeInsetPt * 2,
            characterSpacing: 0.5,
          });
      }
      drawWaveMark(frontX + safeInsetPt, fullHPt - safeInsetPt - 40, 34, accent);
      doc
        .font("Helvetica-Bold")
        .fontSize(11)
        .fillColor("#ffffff")
        .text(opts.author.toUpperCase(), frontX + safeInsetPt + 42, fullHPt - safeInsetPt - 24, {
          width: frontW - safeInsetPt * 2 - 42,
          characterSpacing: 1.2,
        });
      doc.restore();
    }

    function drawGenerativeFront() {
      doc.rect(frontX, 0, frontW, fullHPt).fill(bg);
      // simple wave motif
      doc.save();
      doc.opacity(0.18);
      doc
        .moveTo(frontX, fullHPt * 0.62)
        .bezierCurveTo(
          frontX + frontW * 0.25,
          fullHPt * 0.55,
          frontX + frontW * 0.5,
          fullHPt * 0.68,
          frontX + frontW,
          fullHPt * 0.6
        )
        .lineTo(frontX + frontW, fullHPt)
        .lineTo(frontX, fullHPt)
        .closePath()
        .fill(accent);
      doc.restore();

      doc
        .fillColor(accent)
        .font("Times-Roman")
        .fontSize(9)
        .text("36SEAS PUBLISHING", frontX + safeInsetPt, safeInsetPt, {
          width: frontW - safeInsetPt * 2,
          characterSpacing: 2,
        });
      doc
        .fillColor(ink)
        .font("Times-Bold")
        .fontSize(Math.min(30, frontW / 8))
        .text(opts.title, frontX + safeInsetPt, fullHPt * 0.35, {
          width: frontW - safeInsetPt * 2,
          align: "left",
        });
      if (opts.subtitle) {
        doc
          .fillColor(ink)
          .font("Times-Italic")
          .fontSize(13)
          .text(opts.subtitle, frontX + safeInsetPt, fullHPt * 0.35 + 60, {
            width: frontW - safeInsetPt * 2,
          });
      }
      doc
        .fillColor(ink)
        .font("Times-Roman")
        .fontSize(12)
        .text(opts.author || "Author Name", frontX + safeInsetPt, fullHPt - safeInsetPt - 18, {
          width: frontW - safeInsetPt * 2,
        });
    }

    doc.end();
  });

  return { buffer, spec };
}
