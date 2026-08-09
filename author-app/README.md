# 36Seas Publishing — Manuscript Studio

An AI-assisted manuscript-to-Amazon toolkit for 36Seas Publishing: write or upload a
manuscript, get an AI editorial review, generate cover art and print-ready wraparound
covers, format for KDP, and package everything for submission — gated behind
Free / Starter / Author / Pro / Publisher subscription tiers, with team workspaces and an internal review
dashboard for 36Seas staff.

Branding (palette, wordmark, tone) is pulled from 36seas.com.

## Stack

- **Next.js 16** (App Router, TypeScript, Tailwind v4)
- **Supabase** — auth, Postgres, and Storage (36Seas development project ref `ijffyuxvsrvuwruwtdlm`)
- **Anthropic (Claude)** — editorial review, cover art direction, and the story-builder co-writer
- **pdfkit / nodepub / docx / mammoth** — pure-JS PDF, EPUB, DOCX, and full-cover pipeline (portable to Vercel serverless, no external binaries)
- **Stripe** — hosted Checkout for subscriptions and expert review, automatic Tax, webhooks, refunds, and the customer billing portal
- **Resend** — transactional email (team invites, admin review decisions)
- **JSZip** — submission package assembly

## What's built

| Tool | Status |
|---|---|
| Auth (sign up / sign in) | Working |
| Manuscript upload (.docx/.txt) → Supabase Storage | Working |
| AI editorial review (Claude) | Working once `ANTHROPIC_API_KEY` is set |
| **Story builder** — genre/premise/character intake → AI chapter outline + character profiles → chapter-by-chapter co-writing → compiles into a manuscript | Working once `ANTHROPIC_API_KEY` is set |
| Cover designer (single front cover) | Working out of the box (built-in generative cover); OpenAI, Stability AI, or Replicate for real AI art |
| Live table of contents built from manuscript headings | Working; stale chapter checks are invalidated when chapter content changes |
| Multi-format export (print PDF, reflowable EPUB, editable DOCX) | Working; each request uses one format credit and is gated by rights acceptance + chapter originality clearance |
| Per-chapter originality review (Copyleaks) | Working once Copyleaks credentials and public webhook URL are configured |
| Premium chaptered audiobook generation (Typecast) | Implemented behind an explicit commercial-distribution approval flag; credit cost scales with manuscript length |
| **Full wraparound cover generator** (paperback + hardcover, spine width computed from actual page count per KDP's published formulas) | Working |
| **Cut-and-paste submission sheet** (every KDP field, plus both cover specs) bundled into the submission zip | Working |
| **ISBN pool + auto-assignment** (admin stocks purchased ISBNs; manuscripts draw the next one per format) | Working |
| Submission packager (zip: EPUB, print PDF, cover art, full-wrap covers, metadata.json, SUBMISSION-SHEET.txt) | Working |
| Subscription tiers (Free/Starter/Author/Pro/Publisher) + annual-first Stripe Checkout and billing portal | Working once Stripe keys/price IDs and portal settings are set |
| Paid 36Seas expert publication-package review | Working once its one-time Stripe Price is set |
| Stripe Tax + replay-safe webhook fulfillment/refunds | Wired; requires Tax registrations/product tax codes and the Stripe migration below |
| Atomic credit metering per plan (review/cover/format/submission/story) + one-time universal credit packs | Working after `20260808_atomic_plan_credits.sql` is applied |
| **Team workspaces** (Publisher plan) — shared manuscripts, invite by email | Working; sends a real invite email once `RESEND_API_KEY` is set |
| **36Seas admin dashboard** — review/approve/request-changes on submission packages, manage the ISBN pool | Working, gated on `profiles.role = 'admin'`; approve/request-changes emails the author once `RESEND_API_KEY` is set |

## Local setup

```bash
npm install
cp .env.local.example .env.local   # already pre-filled with your Supabase URL/anon key
npm run dev
```

Fill in `.env.local`:

- `ANTHROPIC_API_KEY` — from console.anthropic.com. Powers the editorial review, cover art direction, and story builder.
- `SUPABASE_SERVICE_ROLE_KEY` — Supabase dashboard → this project → Project Settings → API. Needed for the Stripe webhook handler.
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — Stripe server, webhook, and browser keys. Keep secret keys in `.env.local` and Vercel only; never add them to GitHub.
- `STRIPE_PRICE_*_MONTHLY` / `STRIPE_PRICE_*_ANNUAL` — recurring Prices for Starter ($10/$108), Author ($20/$216), legacy Pro ($29/$313.20), and Publisher ($80/$864). Annual Prices are exactly 10% below twelve monthly payments.
- `STRIPE_PRICE_HUMAN_EVALUATION*` — tier-specific one-time Prices for the human manuscript evaluation: $899 / $849 / $799 / $719 / $629.
- `STRIPE_PRICE_EXPERT_PACKAGE*` — tier-specific one-time Prices for publication-package review, including the 10% / 15% / 20% / 30% member rates.
- `OPENAI_API_KEY` — powers original cover artwork and the temporary per-chapter originality risk review. When this key is present, the app automatically uses OpenAI; a separate provider switch is not required.
- `OPENAI_IMAGE_MODEL` — optional model override. Defaults to `gpt-image-2` for high-quality portrait cover artwork.
- `OPENAI_STORY_MODEL` — optional text-model override for First Mate's structured story-direction map. Defaults to `gpt-5.6-terra`.
- `OPENAI_ORIGINALITY_MODEL` — optional model override for the first-pass chapter risk review. Defaults to `gpt-5.6-terra`.
- `OPENAI_ORIGINALITY_RISK_THRESHOLD` — review-priority score that flags a chapter for author acknowledgment. Defaults to `35` on a 0–100 scale. This AI review does not search the web or a plagiarism database; the provider adapter is intended to transition to Originality.ai.
- `NEXT_PUBLIC_APP_URL` — public app origin, for example `https://app.36seas.com`.
- `TYPECAST_API_TOKEN` — Typecast text-to-speech API token. Audiobook production remains disabled unless `TYPECAST_COMMERCIAL_REDISTRIBUTION_APPROVED=true`; only enable it after 36Seas has a written API/commercial-distribution agreement covering customer-generated audiobooks.
- `IMAGE_GEN_PROVIDER` — optional override for `openai` / `stability` / `replicate`. Leave blank to automatically use OpenAI when its key is present, or the built-in layout when no image key is configured.
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL` — from resend.com/api-keys. Powers team invite emails and admin approve/request-changes notifications. The "from" address's domain needs to be verified in Resend (Domains → Add Domain → add the DNS records it gives you) before you can send from it; until then, or if this is left blank, invites/notifications still work in-app, they just won't land in anyone's inbox.
- **Making yourself an admin** — there's no signup flow for this on purpose. After you sign up once, run in the Supabase SQL editor: `update public.profiles set role = 'admin' where email = 'you@36seas.com';`

## Deploying to Vercel

```bash
npm i -g vercel
vercel link
vercel env add ANTHROPIC_API_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add STRIPE_SECRET_KEY
vercel env add STRIPE_WEBHOOK_SECRET
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
# Add every STRIPE_PRICE_* variable listed in .env.local.example
vercel env add RESEND_API_KEY
vercel env add RESEND_FROM_EMAIL
vercel env add NEXT_PUBLIC_SUPABASE_URL        # https://ijffyuxvsrvuwruwtdlm.supabase.co
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY   # from .env.local.example
vercel env add NEXT_PUBLIC_SITE_URL            # your production URL, once known
vercel --prod
```

## Stripe launch checklist

1. Apply all migrations through `20260809130000_publishing_integrity_exports_audio.sql` before accepting a payment, generation request, originality check, or export.
2. In Stripe **test mode**, create the four paid membership products with monthly and annual Prices. Create one-time tier Prices for human manuscript evaluation and publication-package review, then add every resulting `price_...` ID to Vercel.
3. Assign the appropriate Stripe Tax product tax code and tax behavior to every Price. Add only the tax registrations where 36Seas is actually registered; Stripe cannot decide registration obligations for the company.
4. Enable and configure the Stripe Customer Portal so customers can update payment details, see invoices, and cancel subscriptions.
5. Add the production webhook endpoint `https://app.36seas.com/api/stripe/webhook` for:
   `checkout.session.completed`, `checkout.session.async_payment_succeeded`,
   `checkout.session.async_payment_failed`, `checkout.session.expired`,
   `customer.subscription.created`, `customer.subscription.updated`,
   `customer.subscription.deleted`, `invoice.payment_failed`, and `charge.refunded`.
6. Copy that endpoint's signing secret to `STRIPE_WEBHOOK_SECRET` in Vercel. Test successful/failed payment, tax address collection, a subscription change/cancellation, duplicate webhook delivery, and a full/partial refund before switching to live-mode keys and live-mode Price IDs.

Checkout creates or reuses one Stripe Customer per 36Seas user, calculates tax automatically,
collects billing/tax-ID details, and propagates internal IDs into Stripe metadata. The webhook—not
the browser redirect—is the source of truth for granting access and reserving expert review.

Credit use is serialized in Postgres so simultaneous requests cannot spend the same included or
purchased credit. A credit is charged when a generation or production request begins. Provider
errors and other failures after that point do not automatically return the credit. Input and KDP
validation occur before the charge. Purchased packs are universal and the app consumes included
plan credits first.

I didn't run this from my end — the secret keys only you hold, and Vercel needs them
entered directly. The production build (`npm run build`) passes clean with no TypeScript
or lint errors.

## Cover specs — where the numbers come from

Spine width and full-cover dimensions (`src/lib/kdp-specs.ts`) are taken directly from
Amazon's own help pages (fetched and cross-checked, not estimated from memory or a
third-party calculator):

- Paperback: `spine width = page count × per-page paper thickness` (white 0.002252", cream 0.0025", standard color 0.002252", premium color 0.002347"), plus 0.125" bleed on all outer edges.
- Hardcover: same per-page thickness math on white paper only (hardcover doesn't offer cream), plus 0.51" wrap on all outer edges instead of bleed.
- Both: no spine text below 80 pages, or KDP rejects the file.

These are a reliable starting point for the design team, not a substitute for KDP's own
[cover calculator](https://kdp.amazon.com/cover-calculator) — always re-verify spine width
against the *final* interior page count before sending a cover to print. The generated
`SUBMISSION-SHEET.txt` says this too.

## A note on Amazon KDP

Amazon has no public API for automated book submission. The Submission Packager reflects
that: it bundles your EPUB, print PDF, both full-wrap cover PDFs, cover art, and a
cut-and-paste field sheet (title, description, keywords, categories, price, ISBNs, both
cover specs, and the AI-content disclosure KDP has required since 2026) into one zip, so
the manual upload at kdp.amazon.com is a few minutes of pasting instead of hunting for
numbers.

## Publishing-integrity and export rules

- Signup requires an explicit originality/ownership affirmation. Its version, text hash, and timestamp are stored for audit. The wording is a product draft and must be reviewed by qualified legal counsel before public launch.
- Every current chapter revision must have a completed Copyleaks scan. Flagged results can proceed only after the author explicitly acknowledges them. Editing a chapter changes its content hash and makes the old scan stale.
- PDF, EPUB, DOCX, submission-package, and audiobook endpoints enforce this gate on the server, not only in the interface.
- Print PDF includes a generated TOC and physical page numbers. EPUB is reflowable and uses linked navigation instead of fake fixed page numbers. DOCX remains editable and includes a Word TOC field and page-number footer.
- A charged provider or production request is never silently refunded when generation fails. Users can buy universal top-up credits or upgrade when a plan allowance is exhausted.

## Database

Schema highlights: `profiles` (including its canonical Stripe customer ID), `manuscripts` (now with page count, ISBNs, copyright
holder), `ai_reviews`, `covers` (with a `variant` column: `front` / `paperback_wrap` /
`hardcover_wrap`, plus a `spec` jsonb of the computed dimensions), `formatting_jobs`,
`submission_packages` (with payment/audit fields and an admin `review_status`), `subscription_plans`,
`subscriptions`, `stripe_webhook_events`, `credit_usage`, `isbn_pool`, `workspaces` / `workspace_members`, and
`story_projects` / `story_chapters`. Three private Storage buckets (`manuscripts`,
`covers`, `exports`), row-level security on every table, scoped to the owner or their
active workspace members.

## Known simplifications

- **Email needs a verified domain to actually deliver.** Resend is wired up (team invites,
  admin review decisions), but until `RESEND_FROM_EMAIL`'s domain is verified in Resend
  (or you leave it on their shared `onboarding@resend.dev` sender for testing), sends will
  fail — the invite/notification still gets created in the database regardless, so nothing
  is blocked, people just won't get an email until that's set up.
- **ISBN pool is manual.** There's no live registrar integration (Bowker has none worth
  building against); an admin pastes purchased ISBN-13s into the pool and the app hands
  them out one per manuscript/format.
- **Full-wrap cover art is generative-by-default.** Without an image API key, the front
  panel uses 36Seas' built-in gradient/typography layout — same as the single cover
  designer. Wire in `IMAGE_GEN_PROVIDER` to use a real generated image there instead.
- **Originality results depend on the third-party response.** The UI shows similarity,
  matched sources, and returned passage excerpts. Copyleaks remains the source of truth;
  36Seas does not claim that an automated scan proves ownership.
- **Audiobook production is intentionally locked by default.** Typecast advertises API
  access and commercial use subject to its policy, but automated API integration and
  resale/distribution may require a separate agreement. Keep the approval flag off until
  counsel and the vendor confirm the exact 36Seas customer-distribution model.
