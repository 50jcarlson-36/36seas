"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }

    setSent(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-xl tracking-wide text-foreground">
          36SEAS <span className="text-accent">·</span> PUBLISHING
        </Link>
        <p className="mt-8 text-xs font-semibold uppercase tracking-[0.24em] text-accent">
          Account recovery
        </p>
        <h1 className="font-display mt-2 text-3xl">Set your password</h1>
        <p className="mt-2 text-sm leading-6 text-muted">
          Enter the email used for your 36Seas account. We&apos;ll send a secure link to
          activate or reset your password.
        </p>

        {sent ? (
          <div className="mt-8 rounded-lg border border-accent/40 bg-surface p-5">
            <p className="font-medium">Check your email</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              If an account exists for <span className="text-foreground">{email}</span>, a
              recovery link is on its way. Open it in this browser to choose a password.
            </p>
            <Link href="/login" className="mt-5 inline-block text-sm text-accent hover:underline">
              Return to sign in
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label className="text-sm text-muted">Email</label>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="mt-1 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-accent"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {loading ? "Sending secure link…" : "Send password link"}
            </button>
          </form>
        )}

        {!sent && (
          <p className="mt-6 text-sm text-muted">
            Remember your password?{" "}
            <Link href="/login" className="text-accent hover:underline">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
