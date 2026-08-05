# 36Seas Publishing

Responsive static publishing and author site for Joshua Carlson and 36Seas Publishing.

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
