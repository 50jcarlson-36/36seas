import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../36seas-site/', import.meta.url));
const origin = 'https://36seas.com';
const walk = path => readdirSync(path, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(resolve(path, e.name)) : e.name.endsWith('.html') ? [resolve(path, e.name)] : []);
const urls = [...readFileSync(root + 'sitemap.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
const redirects = new Set(readFileSync(root + '_redirects', 'utf8').split('\n').filter(l => l.startsWith('/')).map(l => origin + l.trim().split(/\s+/)[0]));
const errors = [];
let count = 0;
for (const file of walk(root)) {
  const html = readFileSync(file, 'utf8');
  const head = html.split('</head>')[0];
  const route = origin + '/' + file.slice(root.length).replace(/index\.html$/, '');
  const meta = Object.fromEntries([...head.matchAll(/<meta\s+(?:name|property)="([^"]+)"\s+content="([^"]*)"/g)].map(m => [m[1], m[2]]));
  const canonicals = [...head.matchAll(/rel="canonical" href="([^"]+)"/g)].map(m => m[1]);
  const excluded = meta.robots?.includes('noindex') || redirects.has(route);
  if (excluded) { if (urls.includes(route)) errors.push(`${route}: excluded URL in sitemap`); continue; }
  count++;
  if (canonicals.length !== 1 || !canonicals[0]?.startsWith(origin + '/')) errors.push(`${route}: invalid canonical`);
  if (!/<title>[^<]+<\/title>/.test(head)) errors.push(`${route}: missing title`);
  for (const key of ['description', 'og:title', 'og:description', 'og:url', 'og:image', 'twitter:card', 'twitter:title', 'twitter:description', 'twitter:image']) {
    if (!meta[key]) errors.push(`${route}: missing ${key}`);
  }
  if (meta['og:url'] !== canonicals[0]) errors.push(`${route}: conflicting canonical and Open Graph URL`);
  if ((html.match(/<h1\b/g) || []).length !== 1) errors.push(`${route}: expected one main heading`);
  for (const key of ['og:image', 'twitter:image']) {
    if (!meta[key]) continue;
    const image = new URL(meta[key], origin);
    if (image.origin === origin && !existsSync(resolve(root, '.' + decodeURIComponent(image.pathname)))) errors.push(`${route}: missing sharing image`);
  }
  if (route === canonicals[0] && !urls.includes(route)) errors.push(`${route}: canonical public page missing from sitemap`);
  if (route !== canonicals[0] && urls.includes(route)) errors.push(`${route}: duplicate alias in sitemap`);
  for (const block of head.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { const data = JSON.parse(block[1]); if (data['@context'] !== 'https://schema.org') errors.push(`${route}: invalid schema context`); }
    catch { errors.push(`${route}: invalid structured data`); }
  }
}
for (const url of urls) if (redirects.has(url)) errors.push(`${url}: redirect in sitemap`);
if (!readFileSync(root + 'robots.txt', 'utf8').includes(`Sitemap: ${origin}/sitemap.xml`)) errors.push('Missing public sitemap directive');
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`PASS SEO: ${count} public page heads, ${urls.length} canonical sitemap URLs; redirects and noindex pages excluded.`);
