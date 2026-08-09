"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import {
  AlignLeft,
  Bold,
  BookOpen,
  Check,
  ChevronDown,
  Cloud,
  Heading1,
  Heading2,
  Italic,
  List,
  ListOrdered,
  LoaderCircle,
  MessageSquareText,
  PanelLeft,
  Quote,
  Redo2,
  Save,
  Search,
  Send,
  Sparkles,
  Strikethrough,
  Undo2,
  WandSparkles,
  X,
} from "lucide-react";
import { AI_WRITING_PARTNER_NAME } from "@/lib/brand";
import Link from "next/link";

type SaveState = "loading" | "idle" | "saving" | "saved" | "error";
type AssistAction = "improve" | "shorten" | "expand" | "grammar" | "simplify" | "continue";
type Selection = { from: number; to: number; text: string };
type Suggestion = { from: number; to: number; original: string; label: string; replacement: string; remaining?: number };
type WritingProfile = {
  tone: string;
  voice: string;
  pointOfView: string;
  audience: string;
  intent: string;
  storyPromise: string;
  characters: string;
  setting: string;
  themes: string;
  guardrails: string;
};
type ChatMessage = { id: string; role: "user" | "assistant"; content: string };
type Chapter = { label: string; pos: number; level: number };
type ProfileFieldConfig = {
  key: keyof WritingProfile;
  label: string;
  placeholder: string;
  multiline?: boolean;
};

const EMPTY_PROFILE: WritingProfile = {
  tone: "",
  voice: "",
  pointOfView: "",
  audience: "",
  intent: "",
  storyPromise: "",
  characters: "",
  setting: "",
  themes: "",
  guardrails: "",
};

const PROFILE_FIELDS: ProfileFieldConfig[] = [
  { key: "storyPromise", label: "Book promise", placeholder: "What experience are you promising the reader?" },
  { key: "audience", label: "Audience", placeholder: "Who is this book for?" },
  { key: "intent", label: "Author intent", placeholder: "What should this book make the reader feel or do?" },
  { key: "voice", label: "Voice", placeholder: "Direct, lyrical, witty, intimate…" },
  { key: "tone", label: "Tone", placeholder: "Hopeful, tense, authoritative…" },
  { key: "pointOfView", label: "Point of view", placeholder: "First person, close third, mixed…" },
  { key: "characters", label: "Characters / people", placeholder: "Names, roles, wants, conflicts", multiline: true },
  { key: "setting", label: "World / setting", placeholder: "Places, time period, rules", multiline: true },
  { key: "themes", label: "Themes", placeholder: "Ideas the book keeps returning to" },
  { key: "guardrails", label: "Never change", placeholder: "Canon, wording, sensitivities, boundaries", multiline: true },
];

const ASSIST_ACTIONS: { action: AssistAction; label: string }[] = [
  { action: "improve", label: "Improve" },
  { action: "shorten", label: "Shorten" },
  { action: "expand", label: "Expand" },
  { action: "grammar", label: "Fix grammar" },
  { action: "simplify", label: "Simplify" },
  { action: "continue", label: "Continue" },
];

const STARTERS = [
  "Help me decide what happens next",
  "Review this chapter like an editor",
  "Make the scene more vivid without changing my voice",
  "Find continuity or pacing problems",
];

function countWords(content: string) {
  return content.trim() ? content.trim().split(/\s+/).length : 0;
}

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function plainTextToHtml(value: string) {
  if (!value.trim()) return "";
  return value
    .split(/\n{2,}/)
    .map((paragraph) => {
      const clean = paragraph.trim();
      const heading = /^(chapter\s+[^\n]{0,90}|part\s+[^\n]{0,90}|prologue|epilogue)$/i.test(clean);
      return heading ? `<h2>${escapeHtml(clean)}</h2>` : `<p>${escapeHtml(clean).replace(/\n/g, "<br>")}</p>`;
    })
    .join("");
}

function profileFilled(profile: WritingProfile) {
  return Object.values(profile).filter((value) => value.trim()).length;
}

function normalizeProfile(value: unknown): WritingProfile {
  if (!value || typeof value !== "object" || Array.isArray(value)) return EMPTY_PROFILE;
  const source = value as Record<string, unknown>;
  return Object.fromEntries(
    Object.keys(EMPTY_PROFILE).map((key) => [key, typeof source[key] === "string" ? source[key] : ""])
  ) as WritingProfile;
}

function storyMapExcerpt(value: string) {
  const clean = value.trim();
  const limit = 96_000;
  if (clean.length <= limit) return clean;
  const opening = clean.slice(0, 44_000);
  const middleStart = Math.max(44_000, Math.floor(clean.length / 2) - 12_000);
  const middle = clean.slice(middleStart, middleStart + 24_000);
  const ending = clean.slice(-28_000);
  return `${opening}\n\n[...middle of manuscript...]\n\n${middle}\n\n[...ending of manuscript...]\n\n${ending}`;
}

function ToolbarButton({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-md p-2 transition ${active ? "bg-accent text-accent-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground"} disabled:opacity-30`}
    >
      {children}
    </button>
  );
}

export default function ManuscriptEditor({
  manuscriptId,
  title,
  genre,
  initialStoryCredits,
}: {
  manuscriptId: string;
  title: string;
  genre: string | null;
  initialStoryCredits: number;
}) {
  const [content, setContent] = useState("");
  const [editorHtml, setEditorHtml] = useState("");
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState("");
  const [profile, setProfile] = useState<WritingProfile>(EMPTY_PROFILE);
  const [saveState, setSaveState] = useState<SaveState>("loading");
  const [message, setMessage] = useState("Opening your manuscript…");
  const [showOutline, setShowOutline] = useState(true);
  const [showCopilot, setShowCopilot] = useState(true);
  const [contextOpen, setContextOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [selection, setSelection] = useState<Selection | null>(null);
  const [assistLoading, setAssistLoading] = useState<AssistAction | null>(null);
  const [assistError, setAssistError] = useState("");
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `I’m ${AI_WRITING_PARTNER_NAME}, your 36Seas writing partner. Tell me what you are trying to accomplish, or select a passage and ask me to work with it.`,
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [remainingCredits, setRemainingCredits] = useState<number | null>(initialStoryCredits);
  const [profileProposal, setProfileProposal] = useState<WritingProfile | null>(null);
  const [profileMapLoading, setProfileMapLoading] = useState(false);
  const [profileMapError, setProfileMapError] = useState("");
  const [profileMapSummary, setProfileMapSummary] = useState("");
  const [documentVersion, setDocumentVersion] = useState(0);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRequest = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Placeholder.configure({ placeholder: `Begin writing, paste a draft, or ask ${AI_WRITING_PARTNER_NAME} to help you start…` }),
    ],
    content: "",
    editorProps: {
      attributes: {
        class: "crossing-editor min-h-[64vh] px-7 py-12 font-[Georgia] text-[18px] leading-[1.9] text-[#eee9df] outline-none sm:px-12 lg:px-[10%]",
        spellcheck: "true",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      setEditorHtml(currentEditor.getHTML());
      setContent(currentEditor.getText({ blockSeparator: "\n\n" }));
      setSaveState("idle");
      setMessage("Unsaved changes");
      setSuggestion(null);
      setAssistError("");
      setDocumentVersion((version) => version + 1);
    },
    onSelectionUpdate: ({ editor: currentEditor }) => {
      const { from, to } = currentEditor.state.selection;
      if (from === to) return setSelection(null);
      setSelection({ from, to, text: currentEditor.state.doc.textBetween(from, to, "\n") });
    },
  });

  const snapshot = useMemo(() => JSON.stringify({ content, editorHtml, profile }), [content, editorHtml, profile]);
  const wordCount = useMemo(() => countWords(content), [content]);
  const chapters = useMemo<Chapter[]>(() => {
    if (!editor) return [];
    const items: Chapter[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "heading") {
        items.push({ label: node.textContent || "Untitled section", pos, level: Number(node.attrs.level || 2) });
      }
    });
    return items.length ? items : [{ label: "Manuscript", pos: 0, level: 1 }];
    // documentVersion tracks editor transactions.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, documentVersion]);
  const filteredChapters = search
    ? chapters.filter((chapter) => chapter.label.toLowerCase().includes(search.toLowerCase()))
    : chapters;

  useEffect(() => {
    if (!editor) return;
    const controller = new AbortController();
    fetch(`/api/manuscripts/${manuscriptId}/content`, { signal: controller.signal })
      .then(async (res) => {
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Could not open manuscript");
        const text = typeof json.content === "string" ? json.content : "";
        const html = typeof json.editorContent === "string" && json.editorContent
          ? json.editorContent
          : plainTextToHtml(text);
        const nextProfile = normalizeProfile(json.writingProfile);
        editor.commands.setContent(html, { emitUpdate: false });
        setContent(text || editor.getText({ blockSeparator: "\n\n" }));
        setEditorHtml(html);
        setProfile(nextProfile);
        setLastSavedSnapshot(JSON.stringify({ content: text || editor.getText({ blockSeparator: "\n\n" }), editorHtml: html, profile: nextProfile }));
        setSaveState("idle");
        setMessage("All changes saved");
        setDocumentVersion((version) => version + 1);
      })
      .catch((error) => {
        if (error.name === "AbortError") return;
        setSaveState("error");
        setMessage(error.message);
      });
    return () => controller.abort();
  }, [editor, manuscriptId]);

  useEffect(() => {
    if (saveState === "loading" || snapshot === lastSavedSnapshot) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void save(), 1200);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
    // save is intentionally driven by the current snapshot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, lastSavedSnapshot, saveState]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [chat, chatLoading]);

  async function save() {
    if (snapshot === lastSavedSnapshot || saveState === "loading") return;
    saveRequest.current?.abort();
    const controller = new AbortController();
    saveRequest.current = controller;
    setSaveState("saving");
    setMessage("Saving…");
    try {
      const res = await fetch(`/api/manuscripts/${manuscriptId}/content`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, editorContent: editorHtml, writingProfile: profile }),
        signal: controller.signal,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setLastSavedSnapshot(snapshot);
      setSaveState("saved");
      setMessage("All changes saved");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setSaveState("error");
      setMessage(error instanceof Error ? error.message : "Save failed");
    }
  }

  function updateProfile(field: keyof WritingProfile, value: string) {
    setProfile((current) => ({ ...current, [field]: value }));
    setSaveState("idle");
    setMessage("Saving story direction…");
  }

  async function mapStoryProfile() {
    if (profileMapLoading) return;
    if (content.trim().length < 80) {
      setProfileMapError(`Add a little more manuscript text before asking ${AI_WRITING_PARTNER_NAME} to map the story.`);
      return;
    }

    setProfileMapLoading(true);
    setProfileMapError("");
    setProfileMapSummary("");
    try {
      const res = await fetch(`/api/manuscripts/${manuscriptId}/story-direction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentExcerpt: storyMapExcerpt(content),
          currentProfile: profile,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `${AI_WRITING_PARTNER_NAME} could not map this story right now.`);
      setProfileProposal(normalizeProfile(json.profile));
      setProfileMapSummary(typeof json.sourceSummary === "string" ? json.sourceSummary : `${AI_WRITING_PARTNER_NAME} reviewed the manuscript and prepared a story map.`);
      setRemainingCredits(typeof json.remaining === "number" ? json.remaining : null);
    } catch (error) {
      setProfileMapError(error instanceof Error ? error.message : `${AI_WRITING_PARTNER_NAME} could not map this story right now.`);
    } finally {
      setProfileMapLoading(false);
    }
  }

  function acceptProfileSuggestion(field: keyof WritingProfile) {
    if (!profileProposal?.[field]) return;
    updateProfile(field, profileProposal[field]);
    setProfileProposal((current) => current ? { ...current, [field]: "" } : current);
  }

  function dismissProfileSuggestion(field: keyof WritingProfile) {
    setProfileProposal((current) => current ? { ...current, [field]: "" } : current);
  }

  function applyMissingProfileSuggestions() {
    if (!profileProposal) return;
    setProfile((current) => {
      const next = { ...current };
      PROFILE_FIELDS.forEach(({ key }) => {
        if (!next[key].trim() && profileProposal[key].trim()) next[key] = profileProposal[key];
      });
      return next;
    });
    setProfileProposal(null);
    setSaveState("idle");
    setMessage("Saving AI story direction…");
  }

  function goToChapter(pos: number) {
    if (!editor) return;
    editor.chain().focus().setTextSelection(Math.min(pos + 1, editor.state.doc.content.size)).scrollIntoView().run();
  }

  async function runAssist(action: AssistAction) {
    if (!editor || assistLoading) return;
    const cursor = editor.state.selection.to;
    const sourceSelection = selection || (action === "continue"
      ? { from: cursor, to: cursor, text: editor.state.doc.textBetween(Math.max(0, cursor - 1400), cursor, "\n") }
      : null);
    const requestedSelection = action === "continue" && sourceSelection
      ? { from: sourceSelection.to, to: sourceSelection.to, text: sourceSelection.text }
      : sourceSelection;
    if (!requestedSelection?.text.trim()) {
      setAssistError(action === "continue" ? `Place the cursor after a passage before asking ${AI_WRITING_PARTNER_NAME} to continue.` : "Select a passage first.");
      return;
    }
    setAssistLoading(action);
    setAssistError("");
    setSuggestion(null);
    try {
      const res = await fetch(`/api/manuscripts/${manuscriptId}/assist`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          selection: requestedSelection.text,
          contextBefore: content.slice(0, 5000),
          contextAfter: content.slice(-5000),
          profile,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not create a suggestion");
      setSuggestion({
        from: requestedSelection.from,
        to: requestedSelection.to,
        original: action === "continue" ? "" : requestedSelection.text,
        label: ASSIST_ACTIONS.find((item) => item.action === action)?.label || "Suggested edit",
        replacement: json.suggestion,
        remaining: json.remaining,
      });
      setRemainingCredits(typeof json.remaining === "number" ? json.remaining : null);
      setShowCopilot(true);
    } catch (error) {
      setAssistError(error instanceof Error ? error.message : "Could not create a suggestion");
    } finally {
      setAssistLoading(null);
    }
  }

  function acceptSuggestion() {
    if (!editor || !suggestion) return;
    const current = editor.state.doc.textBetween(suggestion.from, suggestion.to, "\n");
    const hasOriginalSelection = current === suggestion.original;
    if (!hasOriginalSelection && suggestion.from !== suggestion.to) {
      setAssistError("The manuscript changed after this suggestion was created. Select the passage and try again.");
      setSuggestion(null);
      return;
    }
    editor.chain().focus().setTextSelection({ from: suggestion.from, to: suggestion.to }).insertContent(suggestion.replacement).run();
    setSuggestion(null);
    setSelection(null);
  }

  async function askCopilot(request = chatInput) {
    const clean = request.trim();
    if (!clean || chatLoading || !editor) return;
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: clean };
    const history = [...chat, userMessage];
    setChat(history);
    setChatInput("");
    setChatLoading(true);
    setAssistError("");
    try {
      const res = await fetch(`/api/manuscripts/${manuscriptId}/copilot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: clean,
          selection: selection?.text || "",
          documentExcerpt: content,
          profile,
          history: chat.filter((item) => item.id !== "welcome").map(({ role, content: itemContent }) => ({ role, content: itemContent })),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || `${AI_WRITING_PARTNER_NAME} could not answer right now.`);
      const reply = [json.reply, json.followUp].filter(Boolean).join("\n\n");
      setChat((current) => [...current, { id: crypto.randomUUID(), role: "assistant", content: reply }]);
      if (json.suggestion) {
        const { from, to } = selection || editor.state.selection;
        setSuggestion({
          from,
          to,
          original: selection?.text || "",
          label: json.suggestionLabel || `${AI_WRITING_PARTNER_NAME} suggestion`,
          replacement: json.suggestion,
          remaining: json.remaining,
        });
      }
      setRemainingCredits(typeof json.remaining === "number" ? json.remaining : null);
    } catch (error) {
      setChat((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: error instanceof Error ? error.message : `${AI_WRITING_PARTNER_NAME} could not answer right now.`,
      }]);
    } finally {
      setChatLoading(false);
    }
  }

  if (saveState === "loading") {
    return (
      <div className="flex min-h-[70vh] items-center justify-center rounded-xl border border-border bg-surface text-sm text-muted">
        <LoaderCircle className="mr-2 animate-spin" size={18} aria-hidden="true" />
        {message}
      </div>
    );
  }

  const profileProgress = profileFilled(profile);
  const pendingProfileSuggestions = profileProposal
    ? PROFILE_FIELDS.filter(({ key }) => !profile[key].trim() && profileProposal[key].trim())
    : [];

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-[#090b0d] shadow-2xl shadow-black/30">
      <div className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-4 py-3">
        <button type="button" onClick={() => setShowOutline((value) => !value)} className="rounded-md border border-border p-2 text-muted hover:border-accent hover:text-foreground" aria-label="Toggle story navigator">
          <PanelLeft size={17} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className={`text-xs ${saveState === "error" ? "text-red-400" : "text-muted"}`}>{message}</p>
        </div>
        <span className="hidden text-xs text-muted lg:inline">{genre || "Manuscript"} · {wordCount.toLocaleString()} words</span>
        <button type="button" onClick={() => void save()} disabled={snapshot === lastSavedSnapshot || saveState === "saving"} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:border-accent disabled:opacity-40">
          {saveState === "saving" ? <LoaderCircle className="animate-spin" size={14} /> : saveState === "saved" ? <Check size={14} /> : <Save size={14} />}
          Save
        </button>
        <button type="button" onClick={() => setShowCopilot((value) => !value)} className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-bold ${showCopilot ? "bg-accent text-accent-foreground" : "border border-border text-foreground"}`}>
          <Sparkles size={14} /> {AI_WRITING_PARTNER_NAME} AI
        </button>
      </div>

      <div className={`grid min-h-[76vh] ${showOutline && showCopilot ? "xl:grid-cols-[18rem_minmax(30rem,1fr)_23rem]" : showOutline ? "xl:grid-cols-[18rem_minmax(0,1fr)]" : showCopilot ? "xl:grid-cols-[minmax(30rem,1fr)_23rem]" : "grid-cols-1"}`}>
        {showOutline && (
          <aside className="border-b border-border bg-[#0e1113] xl:border-b-0 xl:border-r">
            <div className="border-b border-border p-4">
              <div className="flex items-center justify-between">
                <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-accent"><BookOpen size={15} /> Book map</p>
                <span className="text-[10px] text-muted">{chapters.length} sections</span>
              </div>
              <label className="mt-3 flex items-center gap-2 rounded-md border border-border bg-background px-2.5 py-2">
                <Search size={14} className="text-muted" />
                <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Find a chapter" className="min-w-0 flex-1 bg-transparent text-xs outline-none placeholder:text-muted" />
              </label>
              <nav className="mt-2 max-h-52 space-y-1 overflow-y-auto xl:max-h-64" aria-label="Manuscript chapters">
                {filteredChapters.map((chapter, index) => (
                  <button key={`${chapter.pos}-${chapter.label}`} type="button" onClick={() => goToChapter(chapter.pos)} className="block w-full rounded-md px-2 py-2 text-left text-xs leading-5 text-muted hover:bg-surface-2 hover:text-foreground" style={{ paddingLeft: `${8 + Math.max(0, chapter.level - 1) * 10}px` }}>
                    <span className="mr-2 text-accent/70">{String(index + 1).padStart(2, "0")}</span>{chapter.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-4">
              <button type="button" onClick={() => setContextOpen((value) => !value)} className="flex w-full items-center justify-between text-left">
                <span>
                  <span className="block text-[11px] font-bold uppercase tracking-[0.18em] text-accent">Story direction</span>
                  <span className="mt-1 block text-[10px] text-muted">{profileProgress}/10 signals set</span>
                </span>
                <ChevronDown size={15} className={`text-muted transition ${contextOpen ? "rotate-180" : ""}`} />
              </button>
              <div className="mt-3 h-1 overflow-hidden rounded-full bg-surface-2"><div className="h-full bg-accent transition-all" style={{ width: `${profileProgress * 10}%` }} /></div>
              {contextOpen && (
                <div className="mt-4 max-h-[46vh] space-y-3 overflow-y-auto pr-1">
                  <div className="rounded-lg border border-accent/35 bg-gradient-to-br from-accent/12 to-transparent p-3">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.15em] text-accent"><Sparkles size={13} /> Let {AI_WRITING_PARTNER_NAME} read the draft</p>
                    <p className="mt-1.5 text-[11px] leading-4 text-muted">AI can identify the audience, voice, characters, setting, themes, and story rules. Your existing direction stays protected.</p>
                    <button type="button" onClick={() => void mapStoryProfile()} disabled={profileMapLoading} className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-[10px] font-bold text-accent-foreground transition hover:brightness-110 disabled:opacity-60">
                      {profileMapLoading ? <LoaderCircle className="animate-spin" size={13} /> : <WandSparkles size={13} />}
                      {profileMapLoading ? "Reading your manuscript…" : profileProgress ? "Fill missing fields with AI · 1 credit" : "AI map this story · 1 credit"}
                    </button>
                    {profileMapError && <p className="mt-2 text-[10px] leading-4 text-red-400">{profileMapError}</p>}
                    {profileMapSummary && (
                      <div className="mt-3 border-t border-accent/20 pt-3">
                        <p className="text-[10px] leading-4 text-muted">{profileMapSummary}</p>
                        {pendingProfileSuggestions.length > 0 ? (
                          <button type="button" onClick={applyMissingProfileSuggestions} className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-accent/50 px-2.5 py-2 text-[10px] font-bold text-accent transition hover:bg-accent/10"><Check size={12} /> Use all {pendingProfileSuggestions.length} missing fields</button>
                        ) : (
                          <p className="mt-2 text-[10px] font-semibold text-foreground">{profileProgress === 10 ? "Your current story direction is complete." : "No additional suggestions are pending."}</p>
                        )}
                      </div>
                    )}
                  </div>
                  {PROFILE_FIELDS.map((field) => (
                    <ProfileField
                      key={field.key}
                      label={field.label}
                      value={profile[field.key]}
                      placeholder={field.placeholder}
                      multiline={field.multiline}
                      suggestion={!profile[field.key].trim() ? profileProposal?.[field.key] : undefined}
                      onAcceptSuggestion={() => acceptProfileSuggestion(field.key)}
                      onDismissSuggestion={() => dismissProfileSuggestion(field.key)}
                      onChange={(value) => updateProfile(field.key, value)}
                    />
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        <main className="min-w-0 bg-[#0b0e11]">
          <div className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-border bg-[#101316]/95 px-3 py-2 backdrop-blur">
            <ToolbarButton label="Undo" disabled={!editor?.can().undo()} onClick={() => editor?.chain().focus().undo().run()}><Undo2 size={16} /></ToolbarButton>
            <ToolbarButton label="Redo" disabled={!editor?.can().redo()} onClick={() => editor?.chain().focus().redo().run()}><Redo2 size={16} /></ToolbarButton>
            <span className="mx-1 h-6 w-px bg-border" />
            <ToolbarButton label="Paragraph" active={editor?.isActive("paragraph")} onClick={() => editor?.chain().focus().setParagraph().run()}><AlignLeft size={16} /></ToolbarButton>
            <ToolbarButton label="Heading 1" active={editor?.isActive("heading", { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}><Heading1 size={16} /></ToolbarButton>
            <ToolbarButton label="Heading 2" active={editor?.isActive("heading", { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}><Heading2 size={16} /></ToolbarButton>
            <span className="mx-1 h-6 w-px bg-border" />
            <ToolbarButton label="Bold" active={editor?.isActive("bold")} onClick={() => editor?.chain().focus().toggleBold().run()}><Bold size={16} /></ToolbarButton>
            <ToolbarButton label="Italic" active={editor?.isActive("italic")} onClick={() => editor?.chain().focus().toggleItalic().run()}><Italic size={16} /></ToolbarButton>
            <ToolbarButton label="Strikethrough" active={editor?.isActive("strike")} onClick={() => editor?.chain().focus().toggleStrike().run()}><Strikethrough size={16} /></ToolbarButton>
            <ToolbarButton label="Bullet list" active={editor?.isActive("bulletList")} onClick={() => editor?.chain().focus().toggleBulletList().run()}><List size={16} /></ToolbarButton>
            <ToolbarButton label="Numbered list" active={editor?.isActive("orderedList")} onClick={() => editor?.chain().focus().toggleOrderedList().run()}><ListOrdered size={16} /></ToolbarButton>
            <ToolbarButton label="Block quote" active={editor?.isActive("blockquote")} onClick={() => editor?.chain().focus().toggleBlockquote().run()}><Quote size={16} /></ToolbarButton>
            <span className="ml-auto hidden items-center gap-1.5 text-[10px] text-muted sm:inline-flex"><Cloud size={12} /> Autosave</span>
          </div>

          <div className="border-b border-border bg-background/50 px-4 py-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-1 inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-accent"><WandSparkles size={14} /> AI edit</span>
              {ASSIST_ACTIONS.map(({ action, label }) => (
                <button key={action} type="button" onClick={() => void runAssist(action)} disabled={(action !== "continue" && !selection) || Boolean(assistLoading)} className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-[10px] font-semibold transition hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-35">
                  {assistLoading === action && <LoaderCircle className="animate-spin" size={12} />}{label}
                </button>
              ))}
              <span className="ml-auto text-[10px] text-muted">{selection ? `${countWords(selection.text)} words selected` : "Select text for precise edits"}</span>
            </div>
            {assistError && <p className="mt-2 text-xs text-red-400">{assistError}</p>}
          </div>

          <div className="max-h-[76vh] overflow-y-auto">
            <div className="mx-auto my-5 min-h-[70vh] max-w-4xl border border-white/5 bg-[#0e1215] shadow-xl shadow-black/30">
              <EditorContent editor={editor} />
            </div>
          </div>
        </main>

        {showCopilot && (
          <aside className="flex min-h-[70vh] flex-col border-t border-border bg-[#0f1216] xl:border-l xl:border-t-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="flex items-center gap-2 text-xs font-bold"><span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-accent-foreground"><Sparkles size={14} /></span> {AI_WRITING_PARTNER_NAME} AI</p>
                <p className="mt-1 text-[10px] text-muted">Understands this book and your direction</p>
              </div>
              <button type="button" onClick={() => setShowCopilot(false)} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Close writing partner"><X size={16} /></button>
            </div>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              {profileProgress < 3 && (
                <button type="button" onClick={() => { setShowOutline(true); setContextOpen(true); }} className="w-full rounded-lg border border-accent/30 bg-accent/5 p-3 text-left">
                  <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-accent">Make the AI sound like you</p>
                  <p className="mt-1 text-xs leading-5 text-muted">Add the audience, voice, and book promise. {AI_WRITING_PARTNER_NAME} will use them in every response.</p>
                </button>
              )}

              {chat.map((item) => (
                <div key={item.id} className={item.role === "user" ? "ml-6 rounded-xl bg-accent px-3 py-2.5 text-xs leading-5 text-accent-foreground" : "mr-2 text-xs leading-5 text-[#ddd8cf]"}>
                  {item.role === "assistant" && <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.16em] text-accent">{AI_WRITING_PARTNER_NAME}</p>}
                  <p className="whitespace-pre-wrap">{item.content}</p>
                </div>
              ))}
              {chat.length === 1 && (
                <div className="grid gap-2">
                  {STARTERS.map((starter) => (
                    <button key={starter} type="button" onClick={() => void askCopilot(starter)} className="rounded-lg border border-border px-3 py-2.5 text-left text-[11px] leading-4 text-muted transition hover:border-accent hover:text-foreground">{starter}</button>
                  ))}
                </div>
              )}
              {chatLoading && <div className="flex items-center gap-2 text-xs text-muted"><LoaderCircle className="animate-spin" size={14} /> Reading the manuscript…</div>}

              {suggestion && (
                <div className="rounded-xl border border-accent/35 bg-accent/5 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-accent">{suggestion.label}</p>
                    <button type="button" onClick={() => setSuggestion(null)} className="text-muted hover:text-foreground" aria-label="Dismiss suggestion"><X size={14} /></button>
                  </div>
                  <p className="mt-3 max-h-56 overflow-y-auto whitespace-pre-wrap font-[Georgia] text-sm leading-6 text-[#ebe7de]">{suggestion.replacement}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={acceptSuggestion} className="inline-flex items-center justify-center gap-1.5 rounded-md bg-accent px-3 py-2 text-[10px] font-bold text-accent-foreground"><Check size={13} /> Use this</button>
                    <button type="button" onClick={() => setSuggestion(null)} className="rounded-md border border-border px-3 py-2 text-[10px] font-semibold">Keep mine</button>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>

            <div className="border-t border-border p-3">
              {selection && <p className="mb-2 truncate text-[10px] text-accent">Working with: “{selection.text.slice(0, 75)}…”</p>}
              <div className="rounded-xl border border-border bg-background p-2 focus-within:border-accent">
                <textarea value={chatInput} onChange={(event) => setChatInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void askCopilot(); } }} placeholder="Ask about the story, voice, structure, or selected text…" rows={3} className="w-full resize-none bg-transparent px-1 text-xs leading-5 outline-none placeholder:text-muted" />
                <div className="mt-2 flex items-center justify-between">
                  <span className="flex items-center gap-1 text-[9px] text-muted"><MessageSquareText size={11} /> Shift + Enter for a new line</span>
                  <button type="button" onClick={() => void askCopilot()} disabled={!chatInput.trim() || chatLoading} className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-foreground disabled:opacity-35" aria-label={`Send to ${AI_WRITING_PARTNER_NAME}`}><Send size={14} /></button>
                </div>
              </div>
              {remainingCredits !== null && (
                <div className="mt-2 text-center text-[9px] text-muted">
                  <p>{remainingCredits} AI writing credits available</p>
                  {remainingCredits <= 3 ? (
                    <div className="mt-1 flex items-center justify-center gap-2">
                      <Link href="/dashboard/pricing" className="font-semibold text-accent hover:underline">Upgrade</Link>
                      <span aria-hidden="true">·</span>
                      <Link href="/dashboard/pricing#credit-packs" className="font-semibold text-accent hover:underline">Add credits</Link>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function ProfileField({
  label,
  value,
  placeholder,
  multiline,
  suggestion,
  onAcceptSuggestion,
  onDismissSuggestion,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  multiline?: boolean;
  suggestion?: string;
  onAcceptSuggestion?: () => void;
  onDismissSuggestion?: () => void;
  onChange: (value: string) => void;
}) {
  const shared = "mt-1 w-full rounded-md border border-border bg-background px-2.5 py-2 text-xs leading-5 outline-none placeholder:text-muted/65 focus:border-accent";
  return (
    <div>
      <label className="block text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
        {multiline ? (
          <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={3} className={`${shared} resize-none normal-case tracking-normal text-foreground`} />
        ) : (
          <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className={`${shared} normal-case tracking-normal text-foreground`} />
        )}
      </label>
      {suggestion && (
        <span className="mt-1.5 block rounded-md border border-accent/30 bg-accent/5 p-2 normal-case tracking-normal">
          <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-[0.12em] text-accent"><Sparkles size={10} /> {AI_WRITING_PARTNER_NAME} suggests</span>
          <span className="mt-1 block text-[11px] font-normal leading-4 text-[#ddd8cf]">{suggestion}</span>
          <span className="mt-2 flex gap-1.5">
            <button type="button" onClick={onAcceptSuggestion} className="inline-flex items-center gap-1 rounded bg-accent px-2 py-1 text-[9px] font-bold text-accent-foreground"><Check size={10} /> Use</button>
            <button type="button" onClick={onDismissSuggestion} className="rounded border border-border px-2 py-1 text-[9px] font-semibold text-muted hover:text-foreground">Dismiss</button>
          </span>
        </span>
      )}
    </div>
  );
}
