# Public marketing launch freeze — September 22, 2026

Owner requested a drift check and launch lock (called V1.1 in conversation). Marketing and app retain separate release histories: marketing package 1.0.1 at d79a6307b854a218cd756ec74478eb36063b3d81; app 1.2.0 at bc59bfb3dc87eec55431d2a4eb32921f03e2ee5e. Do not retag or remove approved functionality to match shorthand.

Preserve whole-dollar pricing, shared 26-offer popup catalog, consent/frequency behavior, complete Meat Wagon cover spread, author-owned artwork, and the distinction between software, publication consideration, human services and upcoming betas. Product terms must remain aligned with the app contracts.

Protected source/assets/configuration are hashed in launch-lock.json. CI checks changes, additions and deletions. Updating that lock requires the owner's authorized decision, affected contracts, relevant tests, release evidence and rollback recorded in the PR; never refresh solely to silence a failure. No runtime or website-content change accompanies this freeze.

Run the existing package check plus node scripts/check-launch-lock.mjs and node scripts/test-launch-lock.mjs before merging. Check the deployed public site after relevant changes. A repository hash is not evidence of live deployment identity or certification of private author output. Preserve the app's four open verification follow-ups.
