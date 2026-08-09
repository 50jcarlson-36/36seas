export type ReviewNote = {
  category: "structure" | "pacing" | "character" | "prose" | "dialogue" | "market";
  note: string;
  severity: "minor" | "moderate" | "major";
  locationHint?: string;
};

export type LineEdit = {
  original: string;
  suggestion: string;
  reason: string;
};

export type AiReviewResult = {
  overallScore: number; // 1-10
  summary: string;
  strengths: string[];
  developmentalNotes: ReviewNote[];
  lineEdits: LineEdit[];
  readability: {
    gradeLevel: string;
    pacingAssessment: string;
    voiceConsistency: string;
  };
  marketPositioning: string;
};
