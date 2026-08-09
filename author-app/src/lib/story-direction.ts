import { createHash } from "node:crypto";
import { z } from "zod";
import { AI_WRITING_PARTNER_NAME } from "./brand";

export const storyDirectionSchema = z.object({
  storyPromise: z.string(),
  audience: z.string(),
  intent: z.string(),
  voice: z.string(),
  tone: z.string(),
  pointOfView: z.string(),
  characters: z.string(),
  setting: z.string(),
  themes: z.string(),
  guardrails: z.string(),
  sourceSummary: z.string(),
});

export type StoryDirectionResult = z.infer<typeof storyDirectionSchema>;

const STORY_DIRECTION_JSON_SCHEMA = {
  type: "object",
  properties: {
    storyPromise: { type: "string" },
    audience: { type: "string" },
    intent: { type: "string" },
    voice: { type: "string" },
    tone: { type: "string" },
    pointOfView: { type: "string" },
    characters: { type: "string" },
    setting: { type: "string" },
    themes: { type: "string" },
    guardrails: { type: "string" },
    sourceSummary: { type: "string" },
  },
  required: [
    "storyPromise",
    "audience",
    "intent",
    "voice",
    "tone",
    "pointOfView",
    "characters",
    "setting",
    "themes",
    "guardrails",
    "sourceSummary",
  ],
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
        throw new Error(`${AI_WRITING_PARTNER_NAME} could not analyze this manuscript safely. Try a shorter excerpt.`);
      }
      if (content.type === "output_text" && typeof content.text === "string") return content.text;
    }
  }
  return "";
}

export async function mapStoryDirection(input: {
  userId: string;
  title: string;
  genre?: string;
  synopsis?: string;
  manuscriptExcerpt: string;
  currentProfile?: Record<string, string>;
}): Promise<StoryDirectionResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error(`OpenAI is not configured for ${AI_WRITING_PARTNER_NAME} yet.`);

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_STORY_MODEL || "gpt-5.6-terra",
      store: false,
      safety_identifier: createHash("sha256").update(input.userId).digest("hex").slice(0, 32),
      reasoning: { effort: "low" },
      input: [
        {
          role: "system",
          content: `You are ${AI_WRITING_PARTNER_NAME}, the story analyst for 36Seas Publishing. Build a concise, useful story-direction map from the supplied manuscript.

Use only evidence in the manuscript, title, genre, synopsis, and existing author direction. Never invent plot facts. Treat every non-empty existing profile field as author-approved canon and return it verbatim. Infer missing fields carefully. Keep each value short enough to guide an AI writing partner: usually one sentence, or a compact semicolon-separated list for characters and setting. Describe voice and tone precisely rather than with generic praise. For guardrails, capture established canon, chronology, sensitivities, or boundaries that future writing must preserve. If no explicit guardrail is visible, say to preserve established names, relationships, chronology, point of view, and world rules. The source summary should briefly explain what evidence was available and identify uncertainty without editorial commentary.`,
        },
        {
          role: "user",
          content: `TITLE: ${input.title}\nGENRE: ${input.genre || "Unspecified"}\nSYNOPSIS: ${input.synopsis || "Not supplied"}\n\nAUTHOR-APPROVED DIRECTION (non-empty values are canon):\n${JSON.stringify(input.currentProfile || {}, null, 2)}\n\nMANUSCRIPT EXCERPT:\n---\n${input.manuscriptExcerpt}\n---`,
        },
      ],
      text: {
        verbosity: "low",
        format: {
          type: "json_schema",
          name: "story_direction_map",
          strict: true,
          schema: STORY_DIRECTION_JSON_SCHEMA,
        },
      },
      max_output_tokens: 2600,
    }),
  });

  const payload = await response.json().catch(() => null) as
    | { error?: { message?: string }; status?: string; incomplete_details?: { reason?: string } }
    | null;
  if (!response.ok) {
    throw new Error(payload?.error?.message || `${AI_WRITING_PARTNER_NAME} could not map this story right now.`);
  }
  if (payload?.status === "incomplete") {
    throw new Error(`The story map was incomplete${payload.incomplete_details?.reason ? `: ${payload.incomplete_details.reason}` : "."}`);
  }

  const text = outputText(payload);
  if (!text) throw new Error(`${AI_WRITING_PARTNER_NAME} did not return a story map. Please try again.`);

  try {
    return storyDirectionSchema.parse(JSON.parse(text));
  } catch {
    throw new Error(`${AI_WRITING_PARTNER_NAME} returned an incomplete story map. Please try again.`);
  }
}
