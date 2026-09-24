#!/usr/bin/env node
/**
 * Post-deploy smoke check against the live site.
 *
 * Catches the class of outage that broke catrachohn.com on 2026-09-21: a
 * half-finished deploy where `web.config`'s SPA fallback turns a MISSING
 * hashed asset into `200 text/html` instead of a loud 404. `npm run build`
 * stays green through that failure mode, so this has to poke the actually
 * served site.
 *
 * Checks:
 *   1. Base URL responds 200 text/html (follows redirects).
 *   2. Every /assets/... reference in the served HTML (src= or href=) is
 *      extracted, then fetched: must be 200 AND content-type must match the
 *      extension. A 200 with text/html for a .js/.css asset is exactly the
 *      2026-09-21 failure and is reported as a FAIL.
 *   3. A deliberately absent path under /assets/, /documents/ and /media/
 *      returns a real 404 (guards against the fallback regressing).
 *
 * Usage:
 *   node scripts/smoke-deploy.mjs [baseUrl]
 *   SMOKE_BASE_URL=https://staging.example.com node scripts/smoke-deploy.mjs
 *
 * Exits 0 when every check passes, non-zero otherwise.
 */

const baseUrlArg = process.argv[2] || process.env.SMOKE_BASE_URL || 'https://catrachohn.com';
const baseUrl = baseUrlArg.replace(/\/+$/, '');

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1_000;

// extension -> content-type expectation
const CONTENT_TYPE_BY_EXT = {
  '.js': /javascript/i,
  '.mjs': /javascript/i,
  '.css': /text\/css/i,
  '.svg': /image\/svg/i,
  '.png': /image\/png/i,
  '.jpg': /image\/jpeg/i,
  '.jpeg': /image\/jpeg/i,
  '.woff': /font\/woff|application\/font-woff/i,
  '.woff2': /font\/woff2|application\/font-woff2/i,
  '.ico': /image\/(x-icon|vnd\.microsoft\.icon)/i,
};

const results = [];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Fetch with a timeout and a small retry for TRANSIENT network errors only
 * (timeouts, connection resets, DNS hiccups). Any response that actually
 * comes back from the server — including a 404 or 500 — is returned as-is
 * and is NOT retried, so a genuine assertion failure can never be retried
 * into a pass.
 */
async function fetchResilient(url, options = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const res = await fetch(url, { ...options, signal: controller.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      lastErr = err;
      if (attempt < MAX_RETRIES) {
        console.warn(`  retry ${attempt + 1}/${MAX_RETRIES} after network error on ${url}: ${err.message}`);
        await sleep(RETRY_DELAY_MS);
      }
    }
  }
  throw new Error(`network failure after ${MAX_RETRIES + 1} attempts: ${lastErr?.message ?? 'unknown error'}`);
}

function record(name, pass, detail) {
  results.push({ name, pass, detail });
  const tag = pass ? 'PASS' : 'FAIL';
  console.log(`  [${tag}] ${name}${detail ? `  ${detail}` : ''}`);
}

function extractAssetPaths(html) {
  const re = /(?:src|href)\s*=\s*["'](\/assets\/[^"'\s>]+)["']/g;
  const found = new Set();
  let m;
  while ((m = re.exec(html)) !== null) {
    found.add(m[1]);
  }
  return [...found];
}

function extOf(pathname) {
  const match = pathname.match(/\.[a-z0-9]+$/i);
  return match ? match[0].toLowerCase() : '';
}

async function checkBasePage() {
  console.log(`Checking base URL: ${baseUrl}`);
  let res;
  try {
    res = await fetchResilient(baseUrl, { redirect: 'follow' });
  } catch (err) {
    record('base URL reachable', false, err.message);
    return null;
  }

  const contentType = res.headers.get('content-type') || '';
  const ok = res.status === 200 && /text\/html/i.test(contentType);
  const html = await res.text();
  record(
    'base URL responds 200 text/html',
    ok,
    `status=${res.status} content-type="${contentType}" size=${html.length}B url=${res.url}`,
  );
  if (!ok) return null;
  return html;
}

async function checkAssets(html) {
  const assetPaths = extractAssetPaths(html);
  if (assetPaths.length === 0) {
    record('assets referenced in HTML', false, 'no /assets/... references found in served HTML — something is wrong');
    return;
  }
  record('assets referenced in HTML', true, `found ${assetPaths.length} reference(s): ${assetPaths.join(', ')}`);

  for (const assetPath of assetPaths) {
    const url = new URL(assetPath, baseUrl).toString();
    let res;
    try {
      res = await fetchResilient(url);
    } catch (err) {
      record(`asset ${assetPath}`, false, err.message);
      continue;
    }
    const contentType = res.headers.get('content-type') || '';
    const buf = await res.arrayBuffer();
    const size = buf.byteLength;

    if (res.status !== 200) {
      record(`asset ${assetPath}`, false, `expected 200, got ${res.status} content-type="${contentType}" size=${size}B`);
      continue;
    }

    const ext = extOf(new URL(url).pathname);
    const expected = CONTENT_TYPE_BY_EXT[ext];
    if (expected && !expected.test(contentType)) {
      record(
        `asset ${assetPath}`,
        false,
        `wrong content-type for ${ext}: got "${contentType}" (expected to match ${expected}) size=${size}B — likely the SPA-fallback-masking-a-missing-file bug`,
      );
      continue;
    }
    if (!expected && /text\/html/i.test(contentType)) {
      record(`asset ${assetPath}`, false, `content-type is text/html for an asset path — likely served by the SPA fallback size=${size}B`);
      continue;
    }
    record(`asset ${assetPath}`, true, `status=200 content-type="${contentType}" size=${size}B`);
  }
}

async function check404(dir) {
  const missingPath = `/${dir}/__smoke-check-missing-file-${Date.now()}.txt`;
  const url = new URL(missingPath, baseUrl).toString();
  let res;
  try {
    res = await fetchResilient(url);
  } catch (err) {
    record(`404 under /${dir}/`, false, err.message);
    return;
  }
  const contentType = res.headers.get('content-type') || '';
  const ok = res.status === 404;
  record(`404 under /${dir}/`, ok, `path=${missingPath} status=${res.status} content-type="${contentType}"`);
}

async function main() {
  console.log(`smoke-deploy: target ${baseUrl}\n`);

  const html = await checkBasePage();
  if (html) {
    await checkAssets(html);
  } else {
    record('assets referenced in HTML', false, 'skipped — base page check failed');
  }

  for (const dir of ['assets', 'documents', 'media']) {
    await check404(dir);
  }

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const f of failed) {
      console.log(`  - ${f.name}: ${f.detail}`);
    }
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('smoke-deploy crashed:', err);
  process.exit(1);
});
