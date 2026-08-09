# 36Seas Publishing

Responsive publishing-company site for 36Seas Publishing, its catalog, authors, speaking work, submissions, and the separate First Mate author studio at app.36seas.com.

## Local preview

From the repository root:

```bash
npm install
npm run dev
```

## Cloudflare Pages

The repository includes `wrangler.jsonc` and is ready for either direct deployment or Git integration.

- Production branch: `main`
- Build command: leave blank
- Build output directory: `36seas-site`
- Direct deploy: `npm run deploy`

After the first project deployment, open **Workers & Pages → 36seas → Custom domains**, add `36seas.com`, then add `www.36seas.com` and redirect it to the apex domain using a Cloudflare Redirect Rule.

## Reader list

The Pages function at `/api/subscribe` requires these Cloudflare Pages secrets:

- `RESEND_API_KEY`
- `RESEND_FROM` — a verified sender such as `36Seas Publishing <notifications@36seas.com>`
- `RESEND_REPLY_TO` — optional; defaults to `hello@36seas.com`
- `RESEND_ADMIN_EMAIL` — optional internal signup notification recipient
- `RESEND_SEGMENT_ID` — optional Resend segment for the reader list

Keep secret values in Cloudflare only. Never add them to GitHub.
