import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { resolve, dirname, relative, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../36seas-site');
const walk = dir => readdirSync(dir).flatMap(name => {
  const path = resolve(dir, name);
  return statSync(path).isDirectory() ? walk(path) : path.endsWith('.html') ? [path] : [];
});
const pages = new Map(walk(root).map(path => [path, readFileSync(path, 'utf8')]));
const ids = new Map([...pages].map(([path, html]) => [path, new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]))]));
const errors = [];
let references = 0;
function checkLink(href, base, source) {
  const url = new URL(href.replaceAll('&amp;', '&'), base);
  if (!['http:', 'https:'].includes(url.protocol) || !['36seas.com', 'www.36seas.com'].includes(url.hostname)) return;
  references++;
  let path = resolve(root, '.' + decodeURIComponent(url.pathname));
  if (!path.startsWith(root + '/') && path !== root) { errors.push(`${source}: path outside site`); return; }
  if (existsSync(path) && statSync(path).isDirectory()) path = resolve(path, 'index.html');
  else if (!existsSync(path) && !extname(path)) path = resolve(path, 'index.html');
  if (!existsSync(path)) errors.push(`${source}: missing ${href}`);
  else if (url.hash && ids.has(path) && !ids.get(path).has(decodeURIComponent(url.hash.slice(1)))) errors.push(`${source}: missing anchor ${href}`);
}
for (const [path, html] of pages) {
  const route = relative(root, path).replace(/index\.html$/, '');
  for (const tag of html.matchAll(/<(?:a|link|script|img|iframe)\b[^>]*>/g)) {
    const href = tag[0].match(/\b(?:href|src)="([^"]+)"/);
    if (href) checkLink(href[1], 'https://36seas.com/' + route, route);
  }
  for (const script of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(script[1]); } catch { errors.push(`${route}: invalid JSON-LD`); }
  }
}
const sitemap = readFileSync(resolve(root, 'sitemap.xml'), 'utf8');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
if (!urls.length || new Set(urls).size !== urls.length) errors.push('Sitemap is empty or contains duplicate URLs');
for (const url of urls) {
  if (new URL(url).origin !== 'https://36seas.com') errors.push(`Private or noncanonical sitemap URL: ${url}`);
  checkLink(url, 'https://36seas.com/', 'sitemap.xml');
  let file = resolve(root, '.' + new URL(url).pathname, 'index.html');
  const html = pages.get(file);
  if (html && !html.includes(`rel="canonical" href="${url}"`)) errors.push(`Sitemap/canonical mismatch: ${url}`);
}
const llms = readFileSync(resolve(root, 'llms.txt'), 'utf8');
for (const link of llms.matchAll(/\]\((https?:\/\/[^)]+)\)/g)) {
  if (new URL(link[1]).origin !== 'https://36seas.com') errors.push(`Non-public llms destination: ${link[1]}`);
  checkLink(link[1], 'https://36seas.com/', 'llms.txt');
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`PASS: ${references} public references, ${urls.length} sitemap destinations, and structured data.`);
