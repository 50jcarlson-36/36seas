# Book trailer publication — November 23, 2026

Owner request: “love this. upload it to social media for 36seas and add it to the movie trailer area on 36seeas for this book and do the same for OCala nine”.

Meat Wagon source: `Meat_Wagon_Trailer_Opening_Recut_REVIEW_v15.mp4`, approved in this request, 90.25 seconds. Public YouTube ID `t6iPPeJg1nU`. The public upload uses the source-derived authentic title logo. Ocala Nine: existing public YouTube ID `Sy3XbI8VENs`; YouTube Studio confirms its filename is the latest `Ocala_Nine_Finished_Trailer_v23.mp4`, approximately 100.73 seconds. Reuse the existing upload rather than duplicate it. Both belong to 36seas Publishing, channel `UCvSWV80lmpbG69pbCh64mZw`.

Scope: Replace the “No playable trailer” placeholder in each book page with a responsive 16:9 privacy-enhanced YouTube player, a labeled frame and a direct YouTube fallback. Add scoped `book-trailers.css`. Permit only `https://www.youtube-nocookie.com` in frame-src in addition to the existing signup destination. No autoplay. Preserve original cover art and book purchase actions. No pricing, author app, campaign or software contract changes.

Validation required before merge: `npm run check`, `node scripts/check-launch-lock.mjs`, `node scripts/test-launch-lock.mjs`, plus desktop/mobile browser review of both book trailer sections. Verify published video IDs and player loading on production after Cloudflare Pages deployment.

Release: PR against current origin/main, Cloudflare Pages builds after merge. Record the PR, deployed commit, final checks and production proof in the release output record.

Rollback: revert the release commit/PR to restore the two original placeholders, remove scoped stylesheet and restore the prior frame-src list and hashes. Keep existing social uploads intact.
