import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
for (const path of ['36seas-site/index.html', '36seas-site/pricing/index.html']) {
  const html = readFileSync(path, 'utf8');
  assert.match(html, /brand\/invitations\.js/);
  assert.match(html, /brand\/site\.css/);
  assert.doesNotMatch(html, /<section[^>]*class="author-opportunities/);
}
console.log('PASS: public invitation surfaces use the approved shared invitation renderer.');
