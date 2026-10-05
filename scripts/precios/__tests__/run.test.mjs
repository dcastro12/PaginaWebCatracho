import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parsePrevious } from '../dataset.mjs';
import { run } from '../run.mjs';
import { addDays } from '../validate.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(path.join(here, '..', '__fixtures__', name), 'utf8');
// Last stored values near the fixtures (dollar 26.8989/27.0334, diesel 149.2/153.53).
const PREV = {
  dollar: { buy: 26.89, sell: 27.02, date: '2026-09-30' },
  diesel: { sps: 149.2, tegus: 153.53, date: '2026-09-28' },
  override: null,
  legacy: false,
};
const prev = (over = {}) => ({ ...PREV, ...over });
// run() takes `today` so no test depends on the clock (a 14-day staleness window would
// otherwise rot these fixtures).
const TODAY = '2026-09-30';
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
    await run({ readPreviousFn: async () => PREV, env: {}, today: TODAY });
    expect(process.exitCode).toBeUndefined();
    expect(output()).toBe('');
  });

  // Publishable partial run: must NOT exit non-zero (see report.test.mjs for why).
  it('one source fails, other publishes: exit 0 and degraded=true', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: { section: null } });
    await run({ readPreviousFn: async () => PREV, env: {}, today: TODAY });
    expect(process.exitCode ?? 0).toBe(0);
    expect(output()).toBe('degraded=true\ndegraded_reason=source-failed:laprensa\n');
  });

  // Catalog wiring. These were added after the one-line wiring in run.mjs, so no RED
  // was observed for them; they were checked by mutation (see the apply-progress).
  it('logs the id of the parser that fired', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: fixture('laprensa-single-marker-2026-09-28.html') },
    });
    await run({ readPreviousFn: async () => PREV, env: {}, today: TODAY });
    expect(console.log.mock.calls.map((c) => c.join(' ')).join('\n')).toContain(
      'La Prensa parser: tegus-marker-galon+entra-en-vigencia',
    );
  });

  it('every parser declines: diesel fails loudly (names the count), nothing is guessed, dollar still publishes', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: {
        section: `<a href="${ARTICLE}">x</a>`,
        // Prices a 30-500 heuristic would happily grab, in an unknown format.
        article: '<html><body><div class="paragraph"><p>El diésel cuesta L149.20 por galón y L153.53 en la capital.</p></div></body></html>',
      },
    });
    await run({ readPreviousFn: async () => PREV, env: {}, today: TODAY });
    expect(process.exitCode ?? 0).toBe(0);
    expect(output()).toBe('degraded=true\ndegraded_reason=source-failed:laprensa\n');
    expect(console.warn.mock.calls.map((c) => c.join(' ')).join('\n')).toContain('se probaron 6');
    const written = console.log.mock.calls.map((c) => String(c[0])).find((t) => t.includes('informationSnapshot'));
    expect(written).toContain('"sps": 149.2');
    expect(written).toContain('"date": "2026-09-28"');
  });

  it('both sources fail: exit code 1, no degraded output, does not throw', async () => {
    stubFetch({ ficohsa: null, laprensa: { section: null } });
    await run({ readPreviousFn: async () => PREV, env: {}, today: TODAY });
    expect(process.exitCode).toBe(1);
    expect(output()).toBe('');
  });

  // ---- slice 2b: validation, override, group independence ----
  // Synthetic two-marker article in a format the catalog knows (stated effective date
  // included), so the values reach validation instead of being declined by the parsers.
  const inverted = (sps, tegus, date = '28 de septiembre de 2026') =>
    '<html><body><div class="paragraph">' +
    (date ? `<p>Para la semana que inicia el lunes ${date}.</p>` : '<p>Hay cambios de precios.</p>') +
    `<h2>Precios en San Pedro Sula</h2><p>El diésel cuesta L${sps} por galón.</p>` +
    `<h2>Precios en Tegucigalpa</h2><p>El diésel cuesta L${tegus} por galón.</p>` +
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
  const OVERRIDE = () => `diesel-tegus-gt-sps:${addDays(TODAY, 10)}`;
  const go = (previous, env = {}, today = TODAY) => run({ readPreviousFn: async () => previous, env, today });

  it('dollar blocked does not block diesel: diesel published, dollar keeps its previous value, exit 0', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(prev({ dollar: { buy: 26.0, sell: 26.1, date: '2026-09-20' } }));
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
    await go(prev({ diesel: { sps: 130.0, tegus: 125.0, date: '2026-09-20' } }));
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
    await go(prev({ dollar: { buy: 26.0, sell: 26.1, date: '2026-09-20' } }));
    expect(process.exitCode).toBe(1);
    expect(proposed()).toBe('');
    expect(output()).toBe('');
  });

  it('override APPLIED: diesel published, job red via override-applied, record in the snapshot', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97') },
    });
    await go(prev({ diesel: { sps: 130.0, tegus: 125.0, date: '2026-09-20' } }), { PRECIOS_OVERRIDE: OVERRIDE() });
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
    await go(prev({ diesel: { sps: 130.0, tegus: 140.0, date: '2026-09-20' } }), { PRECIOS_OVERRIDE: 'true' });
    expect(output()).toContain('blocked:diesel-tegus-gt-sps');
    expect(console.warn.mock.calls.map((c) => String(c[0])).join('\n')).toContain('presente pero NO aplicado');
    expect(proposed()).toContain('"override": null');
  });

  it('override never rescues a Tier D violation', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('238.13', '85.14') },
    });
    await go(prev({ diesel: { sps: 146.85, tegus: 151.1, date: '2026-09-20' } }), { PRECIOS_OVERRIDE: OVERRIDE() });
    expect(output()).toContain('blocked:diesel-delta');
    expect(output()).not.toContain('override-applied');
    // The override WAS needed and was not enough: the advisory must not claim otherwise.
    expect(logged()).not.toContain('no fue necesario');
    expect(logged()).toContain('no alcanzó');
  });

  it('a legacy previous skips Tier D and logs it', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(prev({ legacy: true, dollar: { buy: 20, sell: 21, date: '2026-09-20' } }));
    expect(output()).toBe('');
    expect(logged()).toContain('Tier D omitido');
  });

  it('a blocked group with no previous value cannot be carried: nothing is written, exit 1', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97') },
    });
    await go(prev({ diesel: { sps: null, tegus: null, date: '2026-09-20' } }));
    expect(process.exitCode).toBe(1);
    expect(proposed()).toBe('');
  });

  // ---- slice 4: per-group freshness ----
  // The invariant that closes incident A: a carried value carries its carried date.
  const written = () => parsePrevious(proposed());
  const T = () => TODAY;

  it('both groups scraped and published: both dates are today, no shared updatedAt', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(PREV);
    const out = written();
    expect(out.dollar.date).toBe(T());
    expect(out.diesel.date).toBe(T());
    expect(proposed()).not.toContain('updatedAt');
  });

  it('a successful scrape with an UNCHANGED value still gets today (freshness is not "value changed")', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    // Same diesel value as the fixture, old date: 6 days of unchanged weekly price.
    await go(prev({ diesel: { sps: 149.2, tegus: 153.53, date: addDays(T(), -6) } }));
    expect(written().diesel).toEqual({ sps: 149.2, tegus: 153.53, date: T(), parser: 'tegus-marker-galon+entra-en-vigencia' });
  });

  it('incident A regression: diesel parse failure => diesel keeps value AND previous date, never today', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: { section: null } });
    await go(PREV);
    const out = written();
    expect(out.dollar.date).toBe(T());
    expect(out.diesel).toEqual({ sps: 149.2, tegus: 153.53, date: '2026-09-28', parser: null });
    expect(out.diesel.date).not.toBe(T());
    expect(output()).toBe('degraded=true\ndegraded_reason=source-failed:laprensa\n');
  });

  it('dollar failure => dollar keeps value and previous date, diesel gets today', async () => {
    stubFetch({ ficohsa: null, laprensa: goodLaPrensa() });
    await go(PREV);
    const out = written();
    expect(out.dollar).toEqual({ buy: 26.89, sell: 27.02, date: '2026-09-30' });
    expect(out.diesel.date).toBe(T());
  });

  it('a BLOCKED group is not stamped today either: it keeps its previous date', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97') },
    });
    await go(prev({ diesel: { sps: 130.0, tegus: 125.0, date: '2026-09-20' } }));
    expect(written().diesel).toEqual({ sps: 130, tegus: 125, date: '2026-09-20', parser: null });
  });

  it('a carried value whose date is UNKNOWN is not republished: nothing written, exit 1', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: { section: null } });
    await go(prev({ diesel: { sps: 149.2, tegus: 153.53, date: null } }));
    expect(process.exitCode).toBe(1);
    expect(proposed()).toBe('');
    expect(errored()).toContain('fecha');
    expect(errored()).toContain('diesel');
  });

  // ---- slice 3 / amendment: announced price vs price in effect ----
  // Prices take effect on Mondays; the press announces them from Friday or Saturday.
  // The 05/10 article (effective Monday 2026-10-05) shows diesel 149.29 / 153.53.
  const MORAZANICA = () => ({
    section: `<a href="${ARTICLE}">x</a>`,
    article: fixture('laprensa-sps-marker-2026-10-05.html'),
  });
  const FRI = '2026-10-02';
  const SAT = '2026-10-03';
  const SUN = '2026-10-04';
  const MON = '2026-10-05';
  // Before the announcement took effect: dataset shows last week's diesel.
  const LAST_WEEK = { sps: 149.2, tegus: 153.53, date: '2026-10-01' };
  const diesel = () => written().diesel;

  it.each([FRI, SAT, SUN])(
    'announced but not yet in effect (%s): the announcement is ignored, the current value stands, the metric date advances, job green',
    async (day) => {
      stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: MORAZANICA() });
      await go(prev({ diesel: LAST_WEEK }), {}, day);
      expect(diesel()).toMatchObject({ sps: 149.2, tegus: 153.53, date: day });
      expect(process.exitCode ?? 0).toBe(0);
      expect(output()).toBe('');
      expect(logged()).toContain('2026-10-05');
    },
  );

  it('Monday: the value takes over, dated Monday', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: MORAZANICA() });
    await go(prev({ diesel: LAST_WEEK }), {}, MON);
    expect(diesel()).toMatchObject({ sps: 149.29, tegus: 153.53, date: MON });
    expect(output()).toBe('');
    expect(console.log.mock.calls.map((c) => c.join(' ')).join('\n')).toContain('La Prensa parser: sps-marker-galon+vigentes-a-partir');
  });

  it('a pending announcement is never validated: even an inverted pair is simply not published', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97', '5 de octubre de 2026') },
    });
    await go(prev({ diesel: LAST_WEEK }), {}, SAT);
    expect(diesel()).toMatchObject({ sps: 149.2, tegus: 153.53, date: SAT });
    expect(output()).toBe('');
    expect(errored()).not.toContain('BLOQUEO');
  });

  it('pending with nothing to keep (no previous diesel): nothing publishable, exit 1, nothing written', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: MORAZANICA() });
    await go(prev({ diesel: { sps: null, tegus: null, date: null } }), {}, SAT);
    expect(process.exitCode).toBe(1);
    expect(proposed()).toBe('');
  });

  it('an effective date more than 14 days old is not accepted: blocked, red, previous value AND date kept', async () => {
    // The 28/09 article read on 15/10 (17 days): the chronology page did not list the
    // newest article. It would have parsed fine; the date is what exposes it.
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(prev({ diesel: { sps: 150.0, tegus: 154.0, date: '2026-10-12' } }), {}, '2026-10-15');
    expect(output()).toBe('degraded=true\ndegraded_reason=blocked:diesel-effective-date-stale\n');
    expect(diesel()).toEqual({ sps: 150, tegus: 154, date: '2026-10-12', parser: null });
    expect(errored()).toContain('diesel-effective-date-stale');
    expect(written().dollar.date).toBe('2026-10-15');
  });

  it('exactly 14 days old is still accepted', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(PREV, {}, '2026-10-12');
    expect(output()).toBe('');
    expect(diesel()).toMatchObject({ sps: 149.2, tegus: 153.53, date: '2026-10-12' });
  });

  it('prices without a determinable effective date: all parsers decline, diesel not published, job red, date not advanced', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: {
        section: `<a href="${ARTICLE}">x</a>`,
        article: inverted('149.20', '153.53', null),
      },
    });
    await go(PREV);
    expect(output()).toBe('degraded=true\ndegraded_reason=source-failed:laprensa\n');
    expect(diesel()).toEqual({ sps: 149.2, tegus: 153.53, date: '2026-09-28', parser: null });
  });

  // ---- slice 3: parser provenance ----
  it('persists the id of the parser that fired next to the value it produced', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(PREV);
    expect(written().diesel.parser).toBe('tegus-marker-galon+entra-en-vigencia');
    expect(proposed()).toContain('"source": "laprensa"');
  });

  it('a diesel group that is not published keeps the provenance of the value it carries', async () => {
    const carried = { sps: 149.2, tegus: 153.53, date: '2026-09-28', parser: 'two-markers-galon+semana-que-inicia' };
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: { section: null } });
    await go(prev({ diesel: carried }));
    expect(written().diesel).toEqual(carried);
  });

  it('a pending announcement keeps the provenance of the value that stands', async () => {
    const carried = { sps: 149.2, tegus: 153.53, date: '2026-10-01', parser: 'two-markers-galon+semana-que-inicia' };
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: MORAZANICA() });
    await go(prev({ diesel: carried }), {}, SAT);
    expect(written().diesel).toEqual({ ...carried, date: SAT });
  });

  it('the Tier C message names the real parser, not a placeholder', async () => {
    stubFetch({
      ficohsa: fixture('ficohsa-home.html'),
      laprensa: { section: `<a href="${ARTICLE}">x</a>`, article: inverted('130.62', '119.97') },
    });
    await go(prev({ diesel: { sps: 130.0, tegus: 125.0, date: '2026-09-20' } }));
    expect(errored()).toContain('two-markers-galon+semana-que-inicia');
    expect(errored()).not.toContain('"legacy"');
  });

  // No-churn at run level: identical inputs and day produce the identical file, so the
  // prev === next guard keeps preventing empty commits.
  it('two identical runs propose the identical file', async () => {
    stubFetch({ ficohsa: fixture('ficohsa-home.html'), laprensa: goodLaPrensa() });
    await go(PREV);
    const first = proposed();
    console.log.mockClear();
    await go(PREV);
    expect(first).not.toBe('');
    expect(proposed()).toBe(first);
  });
});
