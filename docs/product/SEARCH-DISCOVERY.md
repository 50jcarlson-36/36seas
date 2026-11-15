# Public discovery release — October 3, 2026

Owner requests latest marketing/application releases and current robots/SEO configuration. Marketing owns public indexing; preserve existing training-bot exclusions, search/AI-search access, private-host boundaries, branding, pricing redirects, forms and complete artwork.

Scope: static head metadata, JSON-LD, canonical sitemap, llms.txt, robots.txt, auxiliary-page indexing headers, and discovery validation. Keep public sitemap entries only when canonical, indexable and served without redirect. UX Mindset's duplicate Volume 04 landing page identifies the book detail URL as canonical; both page URLs remain usable. Pricing keeps its authorized 302 to the app but is excluded from the public sitemap. No false lastmod dates, fabricated ratings/offers, or invented business details. Organization, WebSite, SoftwareApplication and seven Book schemas reflect existing visible content.

Verification: parse metadata and structured data; validate canonical, noindex and redirect exclusions; existing artwork/popup/link checks; live sitemap destinations and assets must return successful responses, missing routes must return 404, and existing pricing redirect must survive. No forms submitted, purchases, database or application behavior changes. Rollback public source to 7301a0f5808aac208b3c16b118e3b6a4dd5b1d03. Architecture impact: none; existing static Pages deployment remains authoritative.

Follow-up qualification: book social previews and Book schema use each title’s existing complete cover asset. First Mate product pages reuse the current application social artwork unchanged. No artwork regeneration or body edits. Verified social crawler requests can fetch public images.


## November 15, 2026 — social identity and brand linkbacks
Owner requested current SEO for Outvision, MowMatter, 36seas.com and app.36seas.com, official social profiles and discoverability by AI search. Public page footers now link the verified Facebook, LinkedIn and YouTube profiles plus related brand resources. Organization sameAs uses only this publisher’s own profiles. llms.txt names official profiles and related public resources; its validation permits this exact external allow-list. Existing search-bot access, training exclusions, private-host noindex boundaries, canonical sitemap, prices, books, forms and artwork remain unchanged. The app’s live noindex/nofollow, deny-all robots and empty sitemap were verified; public First Mate discovery remains on 36seas.com.
Validation: package check (42 public heads, 39 sitemap URLs), public references, artwork and launch-lock checks. Publication uses existing Git-connected Pages project; verify actual public HTML after release. Rollback: revert this bounded commit to 9b1739ea7d3203cc8e7e5d239830a65bb829ef65.

Full live sitemap crawl also verified the lightweight reader-news signup page; it now includes the same official social and related-brand footer links. Existing form, consent and subscription behavior is preserved.
