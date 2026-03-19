/**
 * Verifies that all script and link hrefs referenced in HTML files exist.
 * Run from project root: node scripts/verify-assets.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlFiles = ['index.html', 'edger.html', 'outlist.html', 'torcha.html', 'tally.html', 'simoa.html', 'smuffer.html', 'sutral.html'];

let failed = 0;
const checked = new Set();

function exists(rel) {
  const p = path.join(root, rel.split('?')[0]);
  if (checked.has(p)) return true;
  const ok = fs.existsSync(p);
  checked.add(p);
  return ok;
}

htmlFiles.forEach((file) => {
  const filePath = path.join(root, file);
  if (!fs.existsSync(filePath)) {
    console.warn('Skip (missing):', file);
    return;
  }
  const html = fs.readFileSync(filePath, 'utf8');
  const scriptSrc = html.match(/<script[^>]+src=["']([^"']+)["']/g) || [];
  const linkHref = html.match(/<link[^>]+href=["']([^"']+)["']/g) || [];
  scriptSrc.forEach((tag) => {
    const m = tag.match(/src=["']([^"']+)/);
    if (m && !m[1].startsWith('http') && !m[1].startsWith('//')) {
      if (!exists(m[1])) {
        console.error(file, 'missing script:', m[1]);
        failed++;
      }
    }
  });
  linkHref.forEach((tag) => {
    const m = tag.match(/href=["']([^"']+)/);
    if (m && !m[1].startsWith('http') && !m[1].startsWith('//') && m[1].indexOf('.css') !== -1) {
      if (!exists(m[1])) {
        console.error(file, 'missing stylesheet:', m[1]);
        failed++;
      }
    }
  });
});

if (failed === 0) {
  console.log('OK: all referenced assets exist.');
} else {
  console.error('Total missing:', failed);
  process.exit(1);
}
