import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { todayISO } from '../format.mjs';
import { run } from '../run.mjs';
import { addDays } from '../validate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(path.join(here, '..', '__fixtures__', name), 'utf8');
// Last stored values near the fixtures (dollar 26.8989/27.0334, diesel 149.2/153.53).
const PREV = {
  dollar: { buy: 26.89, sell: 27.02 },
  diesel: { sps: 149.2, tegus: 153.53 },
  override: null,
  legacy: false,
};
const prev = (over = {}) => ({ ...PREV, ...over });
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
    await run({ readPreviousFn: async () => PREV, env: {} });
    expect(process.exitCode).toBeUndefined();
    expect(output()).toBe('');
  });

  // Publishable partial run: must NOT exit non-zero (see report.test.mjs for why).
  it('one source fails, other publishes: exit 0 and degraded=true', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: { section: null } });
    await run({ readPreviousFn: async () => PREV, env: {} });
    expect(process.exitCode ?? 0).toBe(0);
    expect(output()).toBe('degraded=true\ndegraded_reason=source-failed:laprensa\n');
  });

  it('both sources fail: exit code 1, no degraded output, does not throw', async () => {
    stubFetch({ ficohsa: null, laprensa: { section: null } });
    await run({ readPreviousFn: async () => PREV, env: {} });
    expect(process.exitCode).toBe(1);
    expect(output()).toBe('');
  });

  // ---- slice 2b: validation, override, group independence ----
  const inverted = (sps, tegus) =>
    '<html><body><div class="paragraph">' +
    `<p>Precios en San Pedro Sula</p><p>El diésel regular cuesta ${sps} lempiras.</p>` +
    `<p>Precios en Tegucigalpa</p><p>El diésel regular cuesta ${tegus} lempiras.</p>` +
    '</div></body></html>';
  const goodLaPrensa = () => ({
    section: `<a href="${ARTICLE}">x</a>`,
    article: fixture('laprensa-single-marker-2026-09-28.html'),
  });
  const proposed = () => {
    const call = console.log.mock.calls.map((c) => String(c[0])).find((t) => t.includes('export const informationSnapshot'));
    return call ?? '';
  };
  const logged = () => console.log.mock.calls.map((c) => String(c[0])).join('\n');
  const errored = () => console.error.mock.calls.map((c) => String(c[0])).join('\n');
  const OVERRIDE = () => `diesel-tegus-gt-sps:${addDays(todayISO(), 10)}`;
  const go = (previous, env = {}) => run({ readPreviousFn: async () => previous, env });

  it('dollar blocked does not block diesel: diesel published, dollar keeps its previous value, exit 0', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(prev({ dollar: { buy: 26.0, sell: 26.1 } }));
    expect(process.exitCode ?? 0).toBe(0);
    expect(output()).toContain('degraded=true');
    expect(output()).toContain('blocked:dollar-delta');
    expect(output()).not.toContain('diesel');
    expect(proposed()).toContain('"buy": 26,');
    expect(proposed()).toContain('"tegus": 153.53');
  });

  it('diesel blocked (tegus <= sps) does not block dollar: dollar published, diesel keeps previous, exit 0', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97') },
    });
    await go(prev({ diesel: { sps: 130.0, tegus: 125.0 } }));
    expect(process.exitCode ?? 0).toBe(0);
    expect(output()).toBe('degraded=true\ndegraded_reason=blocked:diesel-tegus-gt-sps\n');
    expect(proposed()).toContain('"buy": 26.8989');
    expect(proposed()).toContain('"tegus": 125');
    expect(errored()).toContain('estrictamente mayor');
  });

  it('both groups blocked: exit 1 and nothing written', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97') },
    });
    await go(prev({ dollar: { buy: 26.0, sell: 26.1 } }));
    expect(process.exitCode).toBe(1);
    expect(proposed()).toBe('');
    expect(output()).toBe('');
  });

  it('override APPLIED: diesel published, job red via override-applied, record in the snapshot', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97') },
    });
    await go(prev({ diesel: { sps: 130.0, tegus: 125.0 } }), { PRECIOS_OVERRIDE: OVERRIDE() });
    expect(process.exitCode ?? 0).toBe(0);
    expect(output()).toBe('degraded=true\ndegraded_reason=override-applied:diesel-tegus-gt-sps\n');
    expect(proposed()).toContain('"tegus": 119.97');
    expect(proposed()).toContain(`"override": "${OVERRIDE()}"`);
  });

  it('override SET but NOT needed: warning only, no degraded output, green, record still written', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(PREV, { PRECIOS_OVERRIDE: OVERRIDE() });
    expect(process.exitCode ?? 0).toBe(0);
    expect(output()).toBe('');
    expect(logged()).toContain('::warning::');
    expect(logged()).toContain('diesel-tegus-gt-sps');
    expect(proposed()).toContain(`"override": "${OVERRIDE()}"`);
  });

  it('invalid override fails closed: invariant blocks and a distinct message is printed', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97') },
    });
    await go(prev({ diesel: { sps: 130.0, tegus: 140.0 } }), { PRECIOS_OVERRIDE: 'true' });
    expect(output()).toContain('blocked:diesel-tegus-gt-sps');
    expect(console.warn.mock.calls.map((c) => String(c[0])).join('\n')).toContain('presente pero NO aplicado');
    expect(proposed()).toContain('"override": null');
  });

  it('override never rescues a Tier D violation', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('238.13', '85.14') },
    });
    await go(prev({ diesel: { sps: 146.85, tegus: 151.1 } }), { PRECIOS_OVERRIDE: OVERRIDE() });
    expect(output()).toContain('blocked:diesel-delta');
    expect(output()).not.toContain('override-applied');
    // The override WAS needed and was not enough: the advisory must not claim otherwise.
    expect(logged()).not.toContain('no fue necesario');
    expect(logged()).toContain('no alcanzó');
  });

  it('a legacy previous skips Tier D and logs it', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(prev({ legacy: true, dollar: { buy: 20, sell: 21 } }));
    expect(output()).toBe('');
    expect(logged()).toContain('Tier D omitido');
  });

  it('a blocked group with no previous value cannot be carried: nothing is written, exit 1', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97') },
    });
    await go(prev({ diesel: { sps: null, tegus: null } }));
    expect(process.exitCode).toBe(1);
    expect(proposed()).toBe('');
  });
});
