import Anthropic from "@anthropic-ai/sdk";
import { generateText } from "ai";
import type { AiReviewResult } from "./types";
import { AI_WRITING_PARTNER_NAME } from "./brand";

async function generateAiText(input: { system: string; prompt: string; maxTokens: number; feature: string }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: input.maxTokens,
      system: input.system,
      messages: [{ role: "user", content: input.prompt }],
    });
    const block = message.content.find((item) => item.type === "text");
    return block && block.type === "text" ? block.text : "";
  }

  const result = await generateText({
    model: "anthropic/claude-sonnet-4.6",
    system: input.system,
    prompt: input.prompt,
    maxOutputTokens: input.maxTokens,
    providerOptions: {
      gateway: {
        tags: ["product:36seas-author-studio", `feature:${input.feature}`],
      },
    },
  });
  return result.text;
}

const SYSTEM_PROMPT = `You are a professional developmental editor at a boutique publishing house
(36Seas Publishing). You review manuscript excerpts the way a senior acquiring editor would:
honest, specific, constructive, and focused on what will make the book stronger and more
publishable. You never invent plot details that are not present in the text. You always
respond with valid JSON matching the requested schema, with no markdown fences and no
commentary outside the JSON object.`;

export type ManuscriptAssistAction =
  | "improve"
  | "shorten"
  | "expand"
  | "grammar"
  | "simplify"
  | "continue";

const ASSIST_INSTRUCTIONS: Record<ManuscriptAssistAction, string> = {
  improve: "Strengthen clarity, rhythm, specificity, and impact while preserving the author's voice.",
  shorten: "Make the passage meaningfully tighter without losing essential meaning, tone, or facts.",
  expand: "Add useful texture, specificity, and connective detail without padding or inventing facts.",
  grammar: "Correct grammar, spelling, punctuation, and awkward phrasing while changing as little as possible.",
  simplify: "Make the passage easier to understand while preserving its intelligence, meaning, and voice.",
  continue: "Continue naturally from the supplied passage in the same voice, tense, point of view, and pacing.",
};

function buildUserPrompt(title: string, genre: string, manuscriptText: string) {
  return `Manuscript title: ${title}
Genre: ${genre || "unspecified"}

Review the manuscript text below and return a JSON object with EXACTLY these keys:
{
  "overallScore": number (1-10, one decimal allowed),
  "summary": string (3-5 sentences, editorial overview),
  "strengths": string[] (3-6 specific strengths),
  "developmentalNotes": [
    { "category": "structure"|"pacing"|"character"|"prose"|"dialogue"|"market",
      "note": string, "severity": "minor"|"moderate"|"major", "locationHint": string }
  ] (6-12 notes),
  "lineEdits": [
    { "original": string (a real short excerpt, <= 30 words, copied verbatim from the text),
      "suggestion": string, "reason": string }
  ] (5-10 concrete line edits pulled directly from the supplied text),
  "readability": {
    "gradeLevel": string, "pacingAssessment": string, "voiceConsistency": string
  },
  "marketPositioning": string (2-3 sentences on comparable titles / target reader)
}

MANUSCRIPT TEXT:
"""
${manuscriptText.slice(0, 60000)}
"""`;
}

export async function runEditorialReview(
  title: string,
  genre: string,
  manuscriptText: string
): Promise<AiReviewResult> {
  const raw = await generateAiText({
    feature: "editorial-review",
    maxTokens: 4096,
    system: SYSTEM_PROMPT,
    prompt: buildUserPrompt(title, genre, manuscriptText),
  });

  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  const jsonSlice = raw.slice(jsonStart, jsonEnd + 1);

  return JSON.parse(jsonSlice) as AiReviewResult;
}

export async function assistManuscript(input: {
  action: ManuscriptAssistAction;
  title: string;
  genre: string;
  selection: string;
  contextBefore?: string;
  contextAfter?: string;
  profile?: WritingProfile;
}) {
  const instruction = ASSIST_INSTRUCTIONS[input.action];
  const suggestion = (await generateAiText({
    feature: "manuscript-assist",
    maxTokens: 2200,
    system: `You are a precise, respectful book editor at 36Seas Publishing. ${instruction}
Preserve all established facts, names, chronology, point of view, and formatting. Do not add commentary,
headings, quotation marks, or explanations. Return only the prose that should replace the selected passage.
If asked to continue, return only the new continuation rather than repeating the selection.`,
    prompt: `Book: ${input.title}
Genre: ${input.genre || "unspecified"}
Desired voice: ${input.profile?.voice || "preserve the current voice"}
Desired tone: ${input.profile?.tone || "preserve the current tone"}
Point of view: ${input.profile?.pointOfView || "preserve the current point of view"}
Audience: ${input.profile?.audience || "not specified"}
Story promise: ${input.profile?.storyPromise || "not specified"}
Guardrails: ${input.profile?.guardrails || "preserve established facts and intent"}

Context before:
${input.contextBefore || "(none)"}

Selected passage:
${input.selection}

Context after:
${input.contextAfter || "(none)"}`,
  })).trim();
  if (!suggestion) throw new Error("The editor did not return a suggestion. Please try again.");
  return suggestion;
}

export type WritingProfile = {
  tone?: string;
  voice?: string;
  pointOfView?: string;
  audience?: string;
  intent?: string;
  storyPromise?: string;
  characters?: string;
  setting?: string;
  themes?: string;
  guardrails?: string;
};

export type CopilotMessage = { role: "user" | "assistant"; content: string };

export async function runWritingCopilot(input: {
  title: string;
  genre: string;
  synopsis?: string;
  message: string;
  selection?: string;
  documentExcerpt: string;
  profile: WritingProfile;
  history?: CopilotMessage[];
}) {
  const profile = input.profile;
  const bookContext = `BOOK CONTEXT
Title: ${input.title}
Genre: ${input.genre || "Unspecified"}
Synopsis: ${input.synopsis || "Not supplied"}
Audience: ${profile.audience || "Not yet defined"}
Author intent: ${profile.intent || "Not yet defined"}
Story promise: ${profile.storyPromise || "Not yet defined"}
Tone: ${profile.tone || "Preserve the manuscript's existing tone"}
Voice: ${profile.voice || "Preserve the manuscript's existing voice"}
Point of view: ${profile.pointOfView || "Preserve the manuscript's existing point of view"}
Characters / people: ${profile.characters || "Not yet defined"}
Setting / world: ${profile.setting || "Not yet defined"}
Themes: ${profile.themes || "Not yet defined"}
Do not change: ${profile.guardrails || "Established facts, names, chronology, and authorial intent"}`;

  const history = (input.history || []).slice(-8).map((item) => `${item.role.toUpperCase()}: ${item.content.slice(0, 5000)}`).join("\n\n");
  const raw = (await generateAiText({
    feature: "writing-copilot",
    maxTokens: 2600,
    system: `You are ${AI_WRITING_PARTNER_NAME}, the 36Seas AI writing partner. You help an author plan, draft, revise, and finish a publishable book.
Be confident, specific, and collaborative. Never take over the author's voice. Ask one useful question when direction is missing; otherwise act.
Use the supplied book context as canon. When the author asks for prose, return a clean proposed passage as a suggestion.
When the author asks for analysis, coaching, story planning, or editorial feedback, explain the answer without proposing replacement prose unless helpful.

Return valid JSON with exactly this shape and no markdown fence:
{
  "reply": "short, useful response to the author",
  "suggestion": "proposed prose only, or an empty string",
  "suggestionLabel": "short label such as Rewrite, Continue scene, or Opening options",
  "followUp": "one optional next-step question, or an empty string"
}`,
    prompt: `${bookContext}

RECENT CONVERSATION
${history || "(This is the first request.)"}

CURRENT SELECTION
${input.selection || "(The author has not selected text.)"}

DOCUMENT EXCERPT
${input.documentExcerpt.slice(0, 24000)}

AUTHOR REQUEST
${input.message}`,
  })).trim();
  const jsonStart = raw.indexOf("{");
  const jsonEnd = raw.lastIndexOf("}");
  if (jsonStart === -1 || jsonEnd === -1) {
    return { reply: raw || "I could not complete that request. Try asking in a different way.", suggestion: "", suggestionLabel: "", followUp: "" };
  }
  const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1)) as Record<string, unknown>;
  return {
    reply: typeof parsed.reply === "string" ? parsed.reply : "I reviewed the passage.",
    suggestion: typeof parsed.suggestion === "string" ? parsed.suggestion : "",
    suggestionLabel: typeof parsed.suggestionLabel === "string" ? parsed.suggestionLabel : "Suggested edit",
    followUp: typeof parsed.followUp === "string" ? parsed.followUp : "",
  };
}
