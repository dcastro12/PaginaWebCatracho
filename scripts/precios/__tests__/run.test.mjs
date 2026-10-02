import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { run } from '../run.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(path.join(here, '..', '__fixtures__', name), 'utf8');
const ARTICLE = '/economia/honduras-combustibles-suben-precios-lunes-28-de-septiembre-LH32173383';

// run() is exercised with --dry-run so the dataset is never written, and with a
// stubbed fetch so there is no network. GITHUB_OUTPUT points at a temp file.
function stubFetch({ ficohsa, laprensa }) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url) => {
      const u = String(url);
      const body = u.includes('ficohsa') ? ficohsa : u.endsWith('/economia') ? laprensa.section : laprensa.article;
      if (body === null) throw new Error('boom');
      return { ok: true, text: async () => body };
    }),
  );
}

describe('run(): exit code and degraded output', () => {
  let dir;
  let outFile;
  const argvBefore = process.argv;

  beforeEach(() => {
    dir = mkdtempSync(path.join(os.tmpdir(), 'precios-run-'));
    outFile = path.join(dir, 'github_output');
    writeFileSync(outFile, '');
    vi.stubEnv('GITHUB_OUTPUT', outFile);
    process.argv = [...argvBefore, '--dry-run'];
    process.exitCode = undefined;
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    process.argv = argvBefore;
    process.exitCode = undefined;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
    rmSync(dir, { recursive: true, force: true });
  });

  const output = () => readFileSync(outFile, 'utf8');

  it('all sources fine: exit 0, no degraded output', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: {
        section: `<a href="${ARTICLE}">x</a>`,
        article: fixture('laprensa-single-marker-2026-09-28.html'),
      },
    });
    await run();
    expect(process.exitCode).toBeUndefined();
    expect(output()).toBe('');
  });

  // Publishable partial run: must NOT exit non-zero (see report.test.mjs for why).
  it('one source fails, other publishes: exit 0 and degraded=true', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: { section: null } });
    await run();
    expect(process.exitCode ?? 0).toBe(0);
    expect(output()).toBe('degraded=true\ndegraded_reason=source-failed:laprensa\n');
  });

  it('both sources fail: exit code 1, no degraded output, does not throw', async () => {
    stubFetch({ ficohsa: null, laprensa: { section: null } });
    await run();
    expect(process.exitCode).toBe(1);
    expect(output()).toBe('');
  });
});
