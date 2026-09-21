import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
for (const path of ['36seas-site/index.html', '36seas-site/pricing/index.html']) {
  const html = readFileSync(path, 'utf8');
  assert.match(html, /lead-popups\.js/);
  assert.match(html, /lead-popups\.css/);
  assert.doesNotMatch(html, /<section[^>]*class="author-opportunities/);
}
console.log('PASS: public campaign surfaces use the shared popup renderer.');
