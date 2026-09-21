import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
for (const file of ['index.html', 'pricing/index.html']) {
  const html = readFileSync(`36seas-site/${file}`, 'utf8');
  assert.match(html, /class="product-shot cover-spread"/);
  assert.match(html, /full-cover-spread\.jpg" alt="Complete Meat Wagon cover/);
  assert.match(html, /width="966" height="666"/);
  assert.match(html, /View full-size cover/);
  assert.doesNotMatch(html, /class="product-shot concept-cover"/);
}
assert.ok(existsSync('36seas-site/assets/meatwagon/full-cover-spread.jpg'));
const css = readFileSync('36seas-site/marketing-clarity.css', 'utf8');
assert.match(css, /\.concept-grid \.cover-spread img\{height:auto;aspect-ratio:966\/666;object-fit:contain/);
console.log('PASS: homepage and pricing retain the complete, uncropped cover spread.');
