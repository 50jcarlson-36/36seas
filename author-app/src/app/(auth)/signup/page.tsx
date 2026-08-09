"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ORIGINALITY_OWNERSHIP_CLAUSE, ORIGINALITY_TERMS_HASH, ORIGINALITY_TERMS_VERSION } from "@/lib/legal";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptedRights, setAcceptedRights] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedRights) {
      setError("You must affirm your publishing rights before creating an account.");
      return;
    }
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          accepted_originality_terms: true,
          terms_version: ORIGINALITY_TERMS_VERSION,
          terms_clause_hash: ORIGINALITY_TERMS_HASH,
          terms_accepted_at: new Date().toISOString(),
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-6 text-center">
        <div>
          <h1 className="font-display text-2xl">Check your email</h1>
          <p className="mt-2 text-sm text-muted">
            We sent a confirmation link to {email}. Follow it to activate your account.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-xl tracking-wide text-foreground">
          36SEAS <span className="text-accent">·</span> PUBLISHING
        </Link>
        <h1 className="font-display mt-8 text-2xl">Create your account</h1>
        <p className="mt-1 text-sm text-muted">Start your manuscript&apos;s crossing.</p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="text-sm text-muted">Name</label>
            <input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm text-muted">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <div>
            <label className="text-sm text-muted">Password</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
            />
          </div>
          <label className="flex items-start gap-3 rounded-md border border-border bg-surface p-3 text-xs leading-5 text-muted">
            <input
              type="checkbox"
              required
              checked={acceptedRights}
              onChange={(event) => setAcceptedRights(event.target.checked)}
              className="mt-1 h-4 w-4 accent-[#d0a45d]"
            />
            <span>
              {ORIGINALITY_OWNERSHIP_CLAUSE}{" "}
              <Link href="https://36seas.com/terms/" className="text-accent hover:underline">Read the Terms.</Link>
            </span>
          </label>
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !acceptedRights}
            className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
