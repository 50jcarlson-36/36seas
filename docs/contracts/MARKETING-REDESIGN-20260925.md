# Authorized marketing release — September 25, 2026
Owner requested a responsive full-site redesign, deeper book/product/editorial pages, four restrained invitation concepts, supplied the approved brand sheet, requested a writing-signup button below publishing, then explicitly instructed “push this live.” This authorizes replacing the previous public design baseline.

Scope: static marketing HTML/CSS/JS only. Montserrat/Lato, approved gold wave vector, gold/black/white identity; 35 redesigned pages, own book destinations, First Mate independent export and selective publishing routes. Amazon book purchases and existing First Mate signup plan/billing URLs remain external. New invitations replace the homepage/pricing legacy campaign renderer; no new analytics or server/customer records. Frequency state contains dismissal times only. Legacy renderer assets remain for older surfaces.

Preserve production-only routes, Pages functions, headers/CSP, Brevo reader/author integrations, legal disclosures, complete Meat Wagon jacket artwork, workbook delivery and plan prices. Author app source, providers, payment, credits, database and Vercel deployments excluded.

Validation: 43 local pages at 320/1440 passed overflow checks; typography/logo and mobile CTA order checked. Release checks include public links/anchors, full spread, invitation renderer, 16 invitation unit cases, JS syntax and launch-lock mutation test. Final hosted gates and production smoke check recorded in release receipt.

Rollout: PR from latest marketing main 259f55d; merge after applicable checks pass; verify Cloudflare Pages deployment and production identity/CTA. Rollback: revert marketing release commit to prior main (retains integrations).
Architecture impact: static shared identity/invitation ownership only; no author application impact.
