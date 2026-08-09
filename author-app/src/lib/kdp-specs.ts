// KDP print specs sourced directly from Amazon's official help docs (verified Aug 2026):
// - Create a Paperback Cover: https://kdp.amazon.com/help?topicId=G201953020
// - Create a Hardcover Cover: https://kdp.amazon.com/help?topicId=GDTKFJPNQCBTMRV6
//
// IMPORTANT: These numbers are a reliable working estimate for design/layout purposes.
// Always cross-check the final spine width against KDP's own calculator
// (https://kdp.amazon.com/cover-calculator) using the FINAL interior page count before
// sending a cover to print — a misjudged spine width is a real, physical misprint.

export type PaperType = "white" | "cream" | "standard_color" | "premium_color";
export type Binding = "paperback" | "hardcover";

export const TRIM_SIZES: Record<string, [number, number]> = {
  "5x8": [5, 8],
  "5.25x8": [5.25, 8],
  "5.5x8.5": [5.5, 8.5],
  "6x9": [6, 9],
  "8.5x11": [8.5, 11],
};

// Inches of spine width added per interior page, by paper/ink type.
const PAPER_THICKNESS_IN: Record<PaperType, number> = {
  white: 0.002252,
  cream: 0.0025,
  standard_color: 0.002252,
  premium_color: 0.002347,
};

const PAPERBACK_BLEED_IN = 0.125;
const HARDCOVER_WRAP_IN = 0.51;
const HARDCOVER_SAFE_MARGIN_IN = 0.635;
const HARDCOVER_SPINE_HINGE_IN = 0.4;
const MIN_PAGES_FOR_SPINE_TEXT = 80;
export const PAPERBACK_MIN_PAGES = 24;
export const HARDCOVER_MIN_PAGES = 75;
export const HARDCOVER_MAX_PAGES = 550;

export type FullCoverSpec = {
  binding: Binding;
  trimSize: string;
  trimWidthIn: number;
  trimHeightIn: number;
  pageCount: number;
  paperType: PaperType;
  spineWidthIn: number;
  fullWidthIn: number;
  fullHeightIn: number;
  bleedOrWrapIn: number;
  spineTextAllowed: boolean;
  notes: string[];
};

export function paperbackSpineWidthIn(pageCount: number, paperType: PaperType): number {
  return Number((pageCount * PAPER_THICKNESS_IN[paperType]).toFixed(4));
}

// Hardcover (case laminate) is white paper only.
export function hardcoverSpineWidthIn(pageCount: number): number {
  return Number((pageCount * PAPER_THICKNESS_IN.white).toFixed(4));
}

export function computeFullCoverSpec(
  binding: Binding,
  trimSize: string,
  pageCount: number,
  paperType: PaperType = "white"
): FullCoverSpec {
  const [trimWidthIn, trimHeightIn] = TRIM_SIZES[trimSize] || TRIM_SIZES["6x9"];
  const notes: string[] = [];
  const spineTextAllowed = pageCount >= MIN_PAGES_FOR_SPINE_TEXT;
  if (!spineTextAllowed) {
    notes.push(
      `Under ${MIN_PAGES_FOR_SPINE_TEXT} pages — KDP will reject spine text below this threshold. Spine left blank.`
    );
  }

  if (binding === "paperback") {
    const spineWidthIn = paperbackSpineWidthIn(pageCount, paperType);
    const fullWidthIn = Number(
      (PAPERBACK_BLEED_IN * 2 + trimWidthIn * 2 + spineWidthIn).toFixed(4)
    );
    const fullHeightIn = Number((trimHeightIn + PAPERBACK_BLEED_IN * 2).toFixed(4));
    return {
      binding,
      trimSize,
      trimWidthIn,
      trimHeightIn,
      pageCount,
      paperType,
      spineWidthIn,
      fullWidthIn,
      fullHeightIn,
      bleedOrWrapIn: PAPERBACK_BLEED_IN,
      spineTextAllowed,
      notes,
    };
  }

  // hardcover
  const effectivePaper: PaperType = "white";
  const spineWidthIn = hardcoverSpineWidthIn(pageCount);
  const fullWidthIn = Number(
    (HARDCOVER_WRAP_IN * 2 + trimWidthIn * 2 + spineWidthIn).toFixed(4)
  );
  const fullHeightIn = Number((trimHeightIn + HARDCOVER_WRAP_IN * 2).toFixed(4));
  notes.push(
    `Hardcover safe margin: ${HARDCOVER_SAFE_MARGIN_IN}" from the file edge. Spine hinge: ${HARDCOVER_SPINE_HINGE_IN}" flanking each side of the spine — keep text/barcode out of both.`
  );
  if (pageCount > 120) {
    notes.push("Over 120 pages — KDP adds a black-and-white headband at the spine's top/bottom.");
  }
  return {
    binding,
    trimSize,
    trimWidthIn,
    trimHeightIn,
    pageCount,
    paperType: effectivePaper,
    spineWidthIn,
    fullWidthIn,
    fullHeightIn,
    bleedOrWrapIn: HARDCOVER_WRAP_IN,
    spineTextAllowed,
    notes,
  };
}

export function validateFullCoverPageCount(binding: Binding, pageCount: number): string | null {
  if (!Number.isInteger(pageCount) || pageCount < 1) {
    return "The final interior PDF does not have a valid page count.";
  }
  if (binding === "paperback" && pageCount < PAPERBACK_MIN_PAGES) {
    return `KDP paperbacks require at least ${PAPERBACK_MIN_PAGES} interior pages.`;
  }
  if (binding === "hardcover" && (pageCount < HARDCOVER_MIN_PAGES || pageCount > HARDCOVER_MAX_PAGES)) {
    return `KDP hardcovers require ${HARDCOVER_MIN_PAGES}–${HARDCOVER_MAX_PAGES} interior pages.`;
  }
  return null;
}

export const HARDCOVER_SAFE_MARGIN = HARDCOVER_SAFE_MARGIN_IN;
export const HARDCOVER_SPINE_HINGE = HARDCOVER_SPINE_HINGE_IN;
export const PAPERBACK_BLEED = PAPERBACK_BLEED_IN;
export const MIN_PAGES_SPINE_TEXT = MIN_PAGES_FOR_SPINE_TEXT;
