import Anthropic from "@anthropic-ai/sdk";

export type CoverBrief = {
  paletteName: string;
  colors: [string, string, string];
  imagery: string;
  typographyStyle: string;
};

const PALETTES: Record<string, [string, string, string]> = {
  thriller: ["#0b0f14", "#3fd0c9", "#f5f5f0"],
  romance: ["#2a0f1c", "#e8607a", "#f6d9c4"],
  fantasy: ["#0e1630", "#5b6dff", "#f0c869"],
  scifi: ["#040b12", "#22d3ee", "#e5e7eb"],
  nonfiction: ["#0b0e10", "#3fd0c9", "#ffffff"],
  horror: ["#0a0505", "#8b1e2b", "#d9c9a8"],
  default: ["#080a0b", "#3fd0c9", "#f5f5f0"],
};

function paletteForGenre(genre: string): [string, string, string] {
  const key = Object.keys(PALETTES).find((k) => genre?.toLowerCase().includes(k));
  return PALETTES[key ?? "default"];
}

/** Uses Claude to turn a rough prompt into a structured art-direction brief. */
export async function generateCoverBrief(
  title: string,
  genre: string,
  userPrompt: string,
  visualStyle = "Cinematic Thriller"
): Promise<CoverBrief> {
  const [c1, c2, c3] = paletteForGenre(genre);
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return {
      paletteName: genre || "default",
      colors: [c1, c2, c3],
      imagery: userPrompt || "Abstract composition reflecting the manuscript's tone.",
      typographyStyle: `${visualStyle} cover direction with publication-quality hierarchy`,
    };
  }

  const client = new Anthropic({ apiKey });
  const message = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 400,
    system:
      "You are an art director at a boutique publishing house. Respond with ONLY a JSON object: " +
      '{"imagery": string (one vivid sentence describing cover art), "typographyStyle": string}. No markdown fences.',
    messages: [
      {
        role: "user",
        content: `Book title: ${title}\nGenre: ${genre}\nSelected visual style: ${visualStyle}\nAuthor's cover direction: ${userPrompt}`,
      },
    ],
  });

  const block = message.content.find((c) => c.type === "text");
  const raw = block && block.type === "text" ? block.text : "{}";
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1));

  return {
    paletteName: genre || "default",
    colors: [c1, c2, c3],
    imagery: parsed.imagery ?? userPrompt,
    typographyStyle: parsed.typographyStyle ?? "Bold serif display title",
  };
}

/** Builds an SVG cover using the brief. Used as the default renderer (no external image API required). */
export function renderPlaceholderCoverSVG(
  title: string,
  subtitle: string | undefined,
  author: string,
  brief: CoverBrief
): string {
  const [bg, accent, ink] = brief.colors;
  const safe = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;");

  return `<svg width="1600" height="2560" viewBox="0 0 1600 2560" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg}"/>
      <stop offset="100%" stop-color="#000000"/>
    </linearGradient>
    <linearGradient id="wave" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0.15"/>
    </linearGradient>
  </defs>
  <rect width="1600" height="2560" fill="url(#bg)"/>
  <path d="M0,1650 C300,1550 500,1750 800,1680 C1100,1610 1300,1780 1600,1700 L1600,2560 L0,2560 Z" fill="url(#wave)"/>
  <path d="M0,1780 C320,1700 520,1880 820,1800 C1120,1720 1320,1900 1600,1820 L1600,2560 L0,2560 Z" fill="${accent}" opacity="0.18"/>
  <text x="120" y="380" fill="${accent}" font-family="Georgia, serif" font-size="28" letter-spacing="6">36SEAS PUBLISHING</text>
  <text x="120" y="900" fill="${ink}" font-family="Georgia, serif" font-size="108" font-weight="600">
    ${wrapSvgText(safe(title), 120, 108, 13)}
  </text>
  ${subtitle ? `<text x="120" y="1040" fill="${ink}" opacity="0.75" font-family="Georgia, serif" font-size="42" font-style="italic">${safe(subtitle)}</text>` : ""}
  <text x="120" y="2380" fill="${ink}" font-family="Helvetica, Arial, sans-serif" font-size="40" letter-spacing="2">${safe(author || "Author Name")}</text>
</svg>`;
}

function wrapSvgText(text: string, x: number, fontSize: number, maxChars: number): string {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) {
      lines.push(line.trim());
      line = w;
    } else {
      line += " " + w;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines
    .map((l, i) => `<tspan x="${x}" dy="${i === 0 ? 0 : fontSize * 1.05}">${l}</tspan>`)
    .join("");
}

function buildImagePrompt(title: string, genre: string, visualStyle: string, brief: CoverBrief): string {
  return [
    `Create original, publication-quality front cover artwork for a ${genre || "general trade"} book titled "${title}".`,
    `Visual direction: ${visualStyle}.`,
    brief.imagery,
    `Palette: ${brief.colors.join(", ")}.`,
    "Use a strong single focal idea, intentional hierarchy, and generous negative space for the publisher to add exact title and author typography later.",
    "Do not render words, letters, logos, watermarks, borders, mockups, book spines, or 3D books.",
    "High detail, print-ready, 2:3 portrait composition. The artwork must remain legible and compelling at a small storefront thumbnail size.",
  ].join(" ");
}

async function generateWithOpenAI(prompt: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!process.env.OPENAI_API_KEY) return null;
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const res = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      prompt,
      size: "1024x1536",
      quality: "high",
      output_format: "jpeg",
      output_compression: 90,
    }),
  });
  const json = await res.json();
  if (!res.ok) {
    const detail = json?.error?.message || `OpenAI image generation returned ${res.status}`;
    throw new Error(detail);
  }
  const b64 = json.data?.[0]?.b64_json;
  if (!b64) throw new Error("OpenAI did not return cover artwork.");
  return { buffer: Buffer.from(b64, "base64"), mime: "image/jpeg" };
}

// Stability AI REST v2beta — https://platform.stability.ai/docs/getting-started/stable-image
async function generateWithStability(prompt: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!process.env.STABILITY_API_KEY) return null;
  const model = process.env.STABILITY_MODEL || "core"; // "core" | "sd3.5-large" | "ultra"
  const form = new FormData();
  form.append("prompt", prompt);
  form.append("aspect_ratio", "2:3");
  form.append("output_format", "png");

  const res = await fetch(`https://api.stability.ai/v2beta/stable-image/generate/${model}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.STABILITY_API_KEY}`,
      Accept: "image/*",
    },
    body: form,
  });
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  return { buffer, mime: "image/png" };
}

// Replicate — generic model runner. Needs a specific model version pinned via env,
// since "the model" varies (SDXL, Flux, etc). https://replicate.com/docs/reference/http
async function generateWithReplicate(prompt: string): Promise<{ buffer: Buffer; mime: string } | null> {
  if (!process.env.REPLICATE_API_TOKEN || !process.env.REPLICATE_MODEL_VERSION) return null;

  const create = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      version: process.env.REPLICATE_MODEL_VERSION,
      input: { prompt, aspect_ratio: "2:3" },
    }),
  });
  if (!create.ok) return null;
  let prediction = await create.json();

  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline && !["succeeded", "failed", "canceled"].includes(prediction.status)) {
    await new Promise((r) => setTimeout(r, 1500));
    const poll = await fetch(prediction.urls.get, {
      headers: { Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}` },
    });
    if (!poll.ok) break;
    prediction = await poll.json();
  }

  if (prediction.status !== "succeeded") return null;
  const outputUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output;
  if (!outputUrl) return null;

  const imgRes = await fetch(outputUrl);
  if (!imgRes.ok) return null;
  return { buffer: Buffer.from(await imgRes.arrayBuffer()), mime: imgRes.headers.get("content-type") || "image/png" };
}

/**
 * Returns { buffer, mime, ext } for the generated cover.
 *
 * Provider is chosen via IMAGE_GEN_PROVIDER: "openai" | "stability" | "replicate".
 * When the provider is blank, an available OpenAI key selects OpenAI automatically;
 * otherwise the built-in SVG renderer remains available without an external key.
 *
 * Midjourney is intentionally not offered here — it has no official public API,
 * only unofficial/ToS-risky wrappers, which isn't something to build a paid product on.
 */
export async function generateCoverImage(
  title: string,
  subtitle: string | undefined,
  author: string,
  brief: CoverBrief,
  genre = "",
  visualStyle = "Cinematic Thriller"
): Promise<{ buffer: Buffer; mime: string; ext: string }> {
  const provider = process.env.IMAGE_GEN_PROVIDER || (process.env.OPENAI_API_KEY ? "openai" : "");
  const prompt = buildImagePrompt(title, genre, visualStyle, brief);

  let result: { buffer: Buffer; mime: string } | null = null;
  try {
    if (provider === "openai") result = await generateWithOpenAI(prompt);
    else if (provider === "stability") result = await generateWithStability(prompt);
    else if (provider === "replicate") result = await generateWithReplicate(prompt);
  } catch (error) {
    if (provider) throw error;
  }

  if (result) {
    const ext = result.mime.includes("jpeg") ? "jpg" : "png";
    return { ...result, ext };
  }

  if (provider) {
    throw new Error(`${provider} image generation is selected but its API credentials are not configured.`);
  }

  const svg = renderPlaceholderCoverSVG(title, subtitle, author, brief);
  return { buffer: Buffer.from(svg, "utf-8"), mime: "image/svg+xml", ext: "svg" };
}
