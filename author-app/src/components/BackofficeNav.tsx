"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Building2, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function BackofficeNav() {
  const router = useRouter();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-[#080b0c]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1680px] items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link href="/backoffice" className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-[#d0a45d]/40 bg-[#d0a45d]/10 text-[#d0a45d]">
            <Building2 size={19} />
          </span>
          <span>
            <span className="block font-display text-base tracking-wide">36SEAS</span>
            <span className="block text-[9px] font-bold uppercase tracking-[0.24em] text-[#d0a45d]">Company back office</span>
          </span>
        </Link>

        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface hover:text-foreground">
            <ArrowLeft size={14} /> Author studio
          </Link>
          <button type="button" onClick={signOut} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-xs font-semibold text-muted transition hover:bg-surface hover:text-foreground">
            <LogOut size={14} /> <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
