import Link from "next/link";
import { ArrowRight, FileUp, PenLine, PackageCheck } from "lucide-react";

const PATHS = [
  {
    icon: FileUp,
    eyebrow: "I have a manuscript",
    title: "Import your draft",
    body: "Bring in a Word or text file, then review, revise, design, format, and prepare it for publication.",
    href: "/dashboard/manuscripts#upload",
    action: "Upload manuscript",
  },
  {
    icon: PenLine,
    eyebrow: "I have an idea",
    title: "Build the book here",
    body: "Turn a premise into characters, a structured outline, and a chapter-by-chapter working manuscript.",
    href: "/dashboard/story#new-story",
    action: "Create a book plan",
  },
];

export default function StartBookPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">New project</p>
      <h1 className="font-display mt-3 max-w-2xl text-3xl leading-tight sm:text-5xl">
        Every book begins in a different place.
      </h1>
      <p className="mt-4 max-w-2xl text-muted">
        Start with the draft you already have or shape a new idea with the studio. Both paths lead
        to the same publishing workspace.
      </p>

      <div className="mt-10 grid gap-5 md:grid-cols-2">
        {PATHS.map(({ icon: Icon, eyebrow, title, body, href, action }) => (
          <Link
            key={title}
            href={href}
            className="group flex min-h-72 flex-col rounded-xl border border-border bg-surface p-7 transition hover:-translate-y-1 hover:border-accent/70 hover:shadow-[0_24px_80px_rgba(63,208,201,0.08)]"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Icon size={21} aria-hidden="true" />
            </div>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.18em] text-accent">{eyebrow}</p>
            <h2 className="font-display mt-2 text-2xl">{title}</h2>
            <p className="mt-3 flex-1 text-sm leading-6 text-muted">{body}</p>
            <span className="mt-7 inline-flex items-center gap-2 text-sm font-semibold text-foreground">
              {action}
              <ArrowRight size={16} className="transition group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </Link>
        ))}
      </div>

      <div className="mt-6 flex flex-col gap-5 rounded-xl border border-[#b98a45]/35 bg-[linear-gradient(135deg,rgba(185,138,69,0.12),rgba(16,21,26,0.95))] p-7 sm:flex-row sm:items-center">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#d0a45d]/40 text-[#d0a45d]">
          <PackageCheck size={21} aria-hidden="true" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#d0a45d]">36Seas expert service</p>
          <h2 className="font-display mt-1 text-xl">Want us to finish the crossing?</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Submit a publication-ready project for paid expert review, final packaging, and a
            guided KDP submission handoff.
          </p>
        </div>
        <span className="text-sm text-[#d0a45d]">Available before checkout</span>
      </div>
    </div>
  );
}
