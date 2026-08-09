"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/start", label: "Start a book" },
  { href: "/dashboard/manuscripts", label: "Manuscripts" },
  { href: "/dashboard/story", label: "Story builder" },
  { href: "/dashboard/assistance", label: "Assistance" },
  { href: "/dashboard/pricing", label: "Plan & billing" },
];

export default function DashboardNav({
  email,
  tier,
  staffRole,
}: {
  email: string;
  tier: string;
  staffRole?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const isStaff = ["worker", "manager", "admin"].includes(staffRole || "member");
  const links = isStaff ? [...LINKS, { href: "/backoffice", label: "Company back office" }] : LINKS;

  return (
    <aside className="flex w-full flex-col border-b border-border bg-surface px-6 py-4 sm:h-screen sm:w-64 sm:border-b-0 sm:border-r sm:py-8">
      <Link href="/" className="font-display text-lg tracking-wide">
        36SEAS <span className="text-accent">·</span> CROSSING
        <span className="mt-1 block font-sans text-[9px] font-semibold uppercase tracking-[0.28em] text-muted">Publishing studio</span>
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-1">
        <Link
          href="/dashboard/start"
          className="mb-4 rounded-md bg-accent px-3 py-2.5 text-center text-sm font-semibold text-accent-foreground transition hover:brightness-110"
        >
          + New book
        </Link>
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-3 py-2 text-sm ${
              pathname === l.href
                ? "bg-surface-2 text-foreground"
                : "text-muted hover:text-foreground"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </nav>

      <div className="mt-8 border-t border-border pt-4 text-sm">
        <p className="truncate text-muted">{email}</p>
        <p className="mt-1 inline-block rounded-full bg-surface-2 px-2 py-0.5 text-xs uppercase tracking-wide text-accent">
          {tier} plan
        </p>
        <button
          onClick={signOut}
          className="mt-4 block text-sm text-muted hover:text-foreground"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
