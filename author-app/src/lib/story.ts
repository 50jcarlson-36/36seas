import Anthropic from "@anthropic-ai/sdk";

export type OutlineChapter = { chapterNumber: number; title: string; summary: string };
export type CharacterProfile = {
  name: string;
  role: string;
  goal: string;
  trait: string;
  arc: string;
};

export type StoryOutline = {
  workingTitle: string;
  logline: string;
  outline: OutlineChapter[];
  characters: CharacterProfile[];
};

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment to use the story builder."
    );
  }
  return new Anthropic({ apiKey });
}

function parseJson<T>(raw: string): T {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  const arrStart = raw.indexOf("[");
  // Prefer object parse; fall back to whichever bracket appears first if it's an array response.
  if (start === -1 || (arrStart !== -1 && arrStart < start)) {
    return JSON.parse(raw.slice(arrStart, raw.lastIndexOf("]") + 1)) as T;
  }
  return JSON.parse(raw.slice(start, end + 1)) as T;
}

export async function generateStoryOutline(input: {
  genre: string;
  premise: string;
  mainCharacterName: string;
  mainCharacterGoal: string;
  mainCharacterTrait: string;
  setting: string;
  chapterCount?: number;
}): Promise<StoryOutline> {
  const anthropic = client();
  const chapterCount = input.chapterCount || 20;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system:
      "You are a story editor at a boutique publishing house helping a new author structure a novel. " +
      "Respond with ONLY a JSON object matching the requested schema, no markdown fences, no commentary.",
    messages: [
      {
        role: "user",
        content: `Genre: ${input.genre}
Premise: ${input.premise}
Main character: ${input.mainCharacterName} — goal: ${input.mainCharacterGoal}; defining trait: ${input.mainCharacterTrait}
Setting: ${input.setting}

Build a ${chapterCount}-chapter novel outline. Return JSON with EXACTLY these keys:
{
  "workingTitle": string,
  "logline": string (one sentence),
  "outline": [ { "chapterNumber": number, "title": string, "summary": string (3-4 sentences, concrete beats) } ] (${chapterCount} entries, full arc: setup, rising action, midpoint turn, crisis, climax, resolution),
  "characters": [ { "name": string, "role": string, "goal": string, "trait": string, "arc": string } ] (main character plus 3-5 key supporting characters)
}`,
      },
    ],
  });

  const block = message.content.find((c) => c.type === "text");
  const raw = block && block.type === "text" ? block.text : "{}";
  return parseJson<StoryOutline>(raw);
}

export async function generateChapterDraft(input: {
  genre: string;
  workingTitle: string;
  characters: CharacterProfile[];
  chapter: OutlineChapter;
  previousChapterEnding?: string;
  authorNotes?: string;
}): Promise<{ content: string; wordCount: number }> {
  const anthropic = client();

  const characterBlock = input.characters
    .map((c) => `- ${c.name} (${c.role}): goal — ${c.goal}; trait — ${c.trait}; arc — ${c.arc}`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4096,
    system:
      `You are co-writing a ${input.genre} novel titled "${input.workingTitle}" alongside the author. ` +
      "Write full prose — scene-set, dialogue, interiority — in a confident, professional literary voice suited to the genre. " +
      "Continue naturally from the previous chapter if given. Do not summarize; write the actual chapter text. " +
      "Return ONLY the chapter prose, no headers, no meta-commentary.",
    messages: [
      {
        role: "user",
        content: `Characters:\n${characterBlock}\n\nChapter ${input.chapter.chapterNumber}: ${input.chapter.title}\nBeat summary to dramatize: ${input.chapter.summary}\n${
          input.previousChapterEnding
            ? `\nPrevious chapter ended with:\n"""${input.previousChapterEnding.slice(-1200)}"""\n`
            : ""
        }${input.authorNotes ? `\nAuthor's direction for this chapter: ${input.authorNotes}\n` : ""}
Write the full chapter now (aim for 1200-2200 words).`,
      },
    ],
  });

  const block = message.content.find((c) => c.type === "text");
  const content = block && block.type === "text" ? block.text : "";
  const wordCount = content.trim().split(/\s+/).filter(Boolean).length;
  return { content, wordCount };
}
