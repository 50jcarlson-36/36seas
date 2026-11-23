# Public marketing launch freeze — September 22, 2026

Owner requested a drift check and launch lock (called V1.1 in conversation). Marketing and app retain separate release histories: marketing package 1.0.1 at d79a6307b854a218cd756ec74478eb36063b3d81; app 1.2.0 at bc59bfb3dc87eec55431d2a4eb32921f03e2ee5e. Do not retag or remove approved functionality to match shorthand.

Preserve whole-dollar pricing, shared 26-offer popup catalog, consent/frequency behavior, complete Meat Wagon cover spread, author-owned artwork, and the distinction between software, publication consideration, human services and upcoming betas. Product terms must remain aligned with the app contracts.

Protected source/assets/configuration are hashed in launch-lock.json. CI checks changes, additions and deletions. Updating that lock requires the owner's authorized decision, affected contracts, relevant tests, release evidence and rollback recorded in the PR; never refresh solely to silence a failure. No runtime or website-content change accompanies this freeze.

Run the existing package check plus node scripts/check-launch-lock.mjs and node scripts/test-launch-lock.mjs before merging. Check the deployed public site after relevant changes. A repository hash is not evidence of live deployment identity or certification of private author output. Preserve the app's four open verification follow-ups.

## September 25 authorized redesign
Owner explicitly approved the redesigned marketing site, four new restrained invitation concepts, supplied corrected identity, added writing signup, and requested production publication. `MARKETING-REDESIGN-20260925.md` records scope, tests and rollback. On redesigned homepage/pricing, the new invitation renderer supersedes the previous campaign presentation; legacy catalog assets and application campaign system remain intact. The refreshed lock records this authorized baseline.

## Optional GA4 — owner-authorized 2026-10-28
Owner requested Analytics on 36seas.com and app.36seas.com under 50jcarlson@gmail.com. GOOGLE-ANALYTICS-20261028.md defines the bounded loader, privacy controls and Google CSP destinations, verification and rollback. This authorization permits the corresponding public-page script/style inclusions and reviewed analytics hashes; cover art, pricing, campaigns and operational product scopes remain unchanged.

## November 15 — authorized discovery refresh
Owner requested official social links, cross-brand linkbacks and current search/AI discovery. SEARCH-DISCOVERY.md records the scoped public footer/schema/llms changes and exact external link validation. This authorizes the corresponding protected marketing hashes; no product, pricing, campaign, artwork or private-host indexing change.

## November 23 — owner-authorized book trailer publication
Owner approved the latest Meat Wagon trailer and requested social publication plus playable trailers in both book pages, including The Ocala Nine. `docs/releases/BOOK-TRAILERS-20261123.md` records exact source files, public video IDs, validation and rollback. The authorized baseline change is limited to those two trailer sections, their scoped player styling, and the YouTube privacy-enhanced frame destination.
