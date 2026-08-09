import { createHash } from "node:crypto";
import { z } from "zod";
import type { OriginalityMatch } from "./originality";

const findingSchema = z.object({
  category: z.enum([
    "citation_gap",
    "abrupt_voice_shift",
    "formulaic_overlap_risk",
    "internal_repetition",
    "unverifiable_attribution",
  ]),
  severity: z.enum(["low", "medium", "high"]),
  title: z.string(),
  passage: z.string(),
  explanation: z.string(),
});

const resultSchema = z.object({
  riskScore: z.number().int().min(0).max(100),
  summary: z.string(),
  findings: z.array(findingSchema).max(12),
});

const RESULT_JSON_SCHEMA = {
  type: "object",
  properties: {
    riskScore: { type: "integer", minimum: 0, maximum: 100 },
    summary: { type: "string" },
    findings: {
      type: "array",
      maxItems: 12,
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: [
              "citation_gap",
              "abrupt_voice_shift",
              "formulaic_overlap_risk",
              "internal_repetition",
              "unverifiable_attribution",
            ],
          },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          title: { type: "string" },
          passage: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["category", "severity", "title", "passage", "explanation"],
        additionalProperties: false,
      },
    },
  },
  required: ["riskScore", "summary", "findings"],
  additionalProperties: false,
} as const;

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return "";
  const response = payload as {
    output_text?: unknown;
    output?: Array<{ content?: Array<{ type?: unknown; text?: unknown; refusal?: unknown }> }>;
  };
  if (typeof response.output_text === "string") return response.output_text;
  for (const item of response.output || []) {
    for (const content of item.content || []) {
      if (content.type === "refusal" && typeof content.refusal === "string") {
        throw new Error("The AI originality risk review could not analyze this chapter safely.");
      }
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

export async function runOpenAIOriginalityRiskReview(input: {
  userId: string;
  title: string;
  chapterTitle: string;
  chapterBody: string;
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("The AI originality risk review is not configured.");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_ORIGINALITY_MODEL || "gpt-5.6-terra",
      store: false,
      safety_identifier: createHash("sha256").update(input.userId).digest("hex").slice(0, 32),
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content: `You are the first-pass originality risk reviewer for 36Seas Publishing. Review only the supplied chapter. You do not have a plagiarism corpus, live web search, or the ability to prove that text was copied. Never invent a source, URL, match, or similarity claim.

Identify concrete passages that deserve author review because they contain an unattributed quotation or claim, an abrupt voice/style shift, unusually formulaic language that may resemble common published phrasing, repeated text within the chapter, or attribution that cannot be verified from the chapter. Do not flag ordinary genre conventions, necessary factual language, names, titles, or short common phrases. Quote the exact shortest useful passage from the chapter and explain the concern without accusing the author of plagiarism.

The riskScore is a review-priority score, not a plagiarism percentage: 0-14 means no meaningful concern, 15-34 means minor review recommended, 35-64 means material review needed, and 65-100 means serious authorship or attribution concerns. Keep the summary under 60 words and each passage under 280 characters. Return no more than 12 findings.`,
        },
        {
          role: "user",
          content: `BOOK: ${input.title}\nCHAPTER: ${input.chapterTitle}\n\nCHAPTER TEXT:\n---\n${input.chapterBody}\n---`,
        },
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "originality_risk_review",
          strict: true,
          schema: RESULT_JSON_SCHEMA,
        },
      },
      max_output_tokens: 3200,
    }),
  });

  const payload = await response.json().catch(() => null) as
    | { error?: { message?: string }; status?: string; incomplete_details?: { reason?: string } }
    | null;
  if (!response.ok) throw new Error(payload?.error?.message || "The AI originality risk review could not run.");
  if (payload?.status === "incomplete") {
    throw new Error(`The AI originality risk review was incomplete${payload.incomplete_details?.reason ? `: ${payload.incomplete_details.reason}` : "."}`);
  }

  const text = outputText(payload);
  if (!text) throw new Error("The AI originality risk review returned no result.");
  const result = resultSchema.parse(JSON.parse(text));
  const matches: OriginalityMatch[] = result.findings.map((finding) => ({
    providerResultId: finding.category,
    title: finding.title,
    passages: [finding.passage],
    explanation: finding.explanation,
    severity: finding.severity,
  }));
  return { ...result, matches };
}
