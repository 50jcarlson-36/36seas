"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, FileText, FileUp, LoaderCircle, ScanLine } from "lucide-react";

const ACCEPTED_EXTENSIONS = ["docx", "txt", "md"];

function titleFromFileName(fileName: string) {
  return (
    fileName
      .replace(/\.(docx|txt|md)$/i, "")
      .replace(/[-_]+/g, " ")
      .replace(/\s+/g, " ")
      .trim() || "Untitled manuscript"
  );
}

export default function QuickStartDropzone() {
  const router = useRouter();
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("Drop a Word document here");
  const [error, setError] = useState<string | null>(null);

  async function openWritingRoom(file: File) {
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    if (!ACCEPTED_EXTENSIONS.includes(extension)) {
      setError("Choose a Word (.docx), text, or Markdown file.");
      return;
    }

    setLoading(true);
    setError(null);
    setFileName(file.name);
    setMessage("Reading your draft and creating its publishing workspace…");

    const form = new FormData();
    form.append("file", file);
    form.append("title", titleFromFileName(file.name));

    try {
      const response = await fetch("/api/manuscripts/upload", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "We could not read that file.");

      const words = result.manuscript.word_count as number | null;
      setMessage(words ? `${words.toLocaleString()} words found. Opening your book…` : "Draft received. Opening your book…");
      router.push(`/dashboard/manuscripts/${result.manuscript.id}`);
      router.refresh();
    } catch (uploadError) {
      setLoading(false);
      setMessage("Drop a Word document here");
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Please try again.");
    }
  }

  return (
    <div className="mt-7">
      <label
        id="drop"
        onDragEnter={(event) => {
          event.preventDefault();
          if (!loading) setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          const nextTarget = event.relatedTarget as Node | null;
          if (!nextTarget || !event.currentTarget.contains(nextTarget)) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          setDragging(false);
          const file = event.dataTransfer.files[0];
          if (file && !loading) void openWritingRoom(file);
        }}
        className={`group flex cursor-pointer flex-col gap-5 rounded-xl border border-dashed p-5 transition sm:flex-row sm:items-center sm:p-6 ${
          dragging
            ? "border-accent bg-accent/15 shadow-[0_0_45px_rgba(208,164,93,0.12)]"
            : "border-accent/45 bg-black/20 hover:border-accent hover:bg-accent/[0.07]"
        } ${loading ? "cursor-wait" : ""}`}
      >
        <input
          type="file"
          accept=".docx,.txt,.md"
          disabled={loading}
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void openWritingRoom(file);
            event.target.value = "";
          }}
        />
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/10 text-accent">
          {loading ? <LoaderCircle className="animate-spin" size={25} aria-hidden="true" /> : <FileUp size={25} aria-hidden="true" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-bold uppercase tracking-[0.18em] text-accent">
            {loading ? "First Mate is reading" : "Drop your idea or current book"}
          </span>
          <span className="font-display mt-1 block text-xl text-foreground sm:text-2xl">{message}</span>
          <span className="mt-1 block truncate text-xs text-muted">
            {fileName || "Word (.docx), text, or Markdown · no intake form required"}
          </span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-semibold text-accent">
          {loading ? <ScanLine size={18} aria-hidden="true" /> : <>Choose file <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden="true" /></>}
        </span>
      </label>

      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

      <div className="mt-4 flex flex-col gap-3 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-center gap-2"><FileText size={14} className="text-accent" /> We infer the title, read the draft, count the words, and open your workspace.</p>
        <Link href="/dashboard/story#new-story" className="group inline-flex shrink-0 items-center gap-2 font-semibold text-foreground hover:text-accent">
          No document yet? Build from an idea <ArrowRight size={14} className="transition group-hover:translate-x-1" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}
