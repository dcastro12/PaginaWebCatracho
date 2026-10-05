import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CATALOG, findLaPrensaArticlePath, parseDiesel, parseFicohsa } from '../parsers.mjs';

// Fixtures are byte-verbatim captures (see .gitattributes: -text).
// Resolved via fileURLToPath because `new URL(rel, import.meta.url)` is broken
// under the jsdom test environment.
const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name) => readFileSync(path.join(here, '..', '__fixtures__', name), 'utf8');

describe('parseFicohsa', () => {
  it('reads compra/venta from the captured home page', () => {
    expect(parseFicohsa(fixture('ficohsa-home.html'))).toEqual({ buy: 26.8989, sell: 27.0334 });
  });

  it('throws when the exchange block is missing', () => {
    expect(() => parseFicohsa('<html></html>')).toThrow(
      'Ficohsa: bloque .values-uno no encontrado en la home.',
    );
  });

  it('throws when the block has no values', () => {
    expect(() => parseFicohsa('<div class="values-uno"></div>')).toThrow(
      'Ficohsa: valores de Compra/Venta no encontrados.',
    );
  });
});

describe('findLaPrensaArticlePath', () => {
  it('finds the fuel article slug in the section page', () => {
    const html =
      '<a href="/economia/honduras-combustibles-suben-precios-lunes-28-de-septiembre-LH32173383">x</a>';
    expect(findLaPrensaArticlePath(html)).toBe(
      '/economia/honduras-combustibles-suben-precios-lunes-28-de-septiembre-LH32173383',
    );
  });

  it('throws when no article is listed', () => {
    expect(() => findLaPrensaArticlePath('<html></html>')).toThrow(
      'La Prensa: artículo de precios no encontrado en /economia.',
    );
  });
});

// ---------------------------------------------------------------------------
// The La Prensa catalog. Each parser knows exactly ONE article format (a layout
// plus the way that format phrases its effective date) and is defined by a
// verbatim fixture. Captured fixtures:
//   F_1005  live capture 2026-10-04 of .../precios-combustibles-semana-morazanica-2026-honduras-EA32233698
//   F_0928  the 28/09/2026 article (slice 1 fixture)
//   F_0810  Wayback raw capture (2026-08-10T04:49:57Z) of .../honduras-combustibles-cambiaran-precio-medianoche-lunes-BB31658494
//           This is the article behind incident B (published 130.62 / 119.97).
//   F_0921  Wayback raw capture (2026-09-19T19:37:55Z) of .../honduras-aumento-nuevos-precios-combustibles-lunes-21-septiembre-DG32077703
// ---------------------------------------------------------------------------
const F_1005 = 'laprensa-sps-marker-2026-10-05.html';
const F_0928 = 'laprensa-single-marker-2026-09-28.html';
const F_0810 = 'laprensa-two-markers-2026-08-10-incident-b.html';
const F_0921 = 'laprensa-two-markers-lempiras-2026-09-21.html';

// parser id -> fixtures that define it, with the exact expected result. `today` is
// injected (parsers never read the clock) and is only used when the article states
// its effective date without a year.
const EXPECTED = [
  { id: 'sps-marker-galon+vigentes-a-partir', file: F_1005, today: '2026-10-04', sps: 149.29, tegus: 153.53, effective: '2026-10-05' },
  { id: 'tegus-marker-galon+entra-en-vigencia', file: F_0928, today: '2026-09-28', sps: 149.2, tegus: 153.53, effective: '2026-09-28' },
  { id: 'two-markers-galon+semana-que-inicia', file: F_0810, today: '2026-08-10', sps: 130.62, tegus: 134.25, effective: '2026-08-10' },
  { id: 'two-markers-lempiras+vigentes-desde', file: F_0921, today: '2026-09-21', sps: 146.85, tegus: 151.1, effective: '2026-09-21' },
  // Alternative phrasings of the same dates, found in the same articles (the 28/09
  // headline says "desde este lunes 28 de septiembre"; the 05/10 article says the
  // measure "comenzará a aplicarse este lunes 5 de octubre").
  { id: 'tegus-marker-galon+desde-este-lunes', file: F_0928, today: '2026-09-28', sps: 149.2, tegus: 153.53, effective: '2026-09-28' },
  { id: 'sps-marker-galon+comenzara-a-aplicarse', file: F_1005, today: '2026-10-04', sps: 149.29, tegus: 153.53, effective: '2026-10-05' },
];
const ALL_FIXTURES = [F_1005, F_0928, F_0810, F_0921];
const byId = (id) => CATALOG.find((p) => p.id === id);

// Synthetic markup: only the structure the parsers select on (.paragraph p, h2).
const article = (...blocks) =>
  `<html><body><div class="paragraph">${blocks.join('')}</div></body></html>`;
const p = (t) => `<p>${t}</p>`;
const h2 = (t) => `<h2>${t}</h2>`;
// A well-formed two-marker article in the "semana que inicia" format.
const twoMarkers = ({ date = 'Para la semana que inicia el lunes 10 de agosto, hay cambios.', sps = 'L130.62', tegus = 'L134.25' } = {}) =>
  article(
    p(date),
    h2('Precios en San Pedro Sula'),
    p(`El diésel registrará el mayor aumento, para ubicarse en ${sps} por galón.`),
    h2('Precios en Tegucigalpa'),
    p(`El diésel tendrá un incremento y se venderá a ${tegus} por galón.`),
  );

describe('catalog: every parser is defined by a verbatim fixture', () => {
  it('declares the expected parsers in order, one id each', () => {
    expect(CATALOG.map((c) => c.id)).toEqual([...new Set(EXPECTED.map((e) => e.id))]);
  });

  it.each(EXPECTED)('$id parses $file exactly', ({ id, file, today, sps, tegus, effective }) => {
    expect(byId(id).parse(fixture(file), { today })).toEqual({ sps, tegus, effective });
  });

  it('a fixture a parser does not define returns null (every other format declines)', () => {
    for (const { id, file } of EXPECTED) {
      const defines = EXPECTED.filter((e) => e.id === id).map((e) => e.file);
      for (const other of ALL_FIXTURES.filter((f) => f !== file && !defines.includes(f))) {
        expect(byId(id).parse(fixture(other), { today: '2026-10-04' }), `${id} on ${other}`).toBeNull();
      }
    }
  });

  // Declining is normal; throwing is a bug (R3.2).
  it.each([
    ['empty string', ''],
    ['empty document', '<html></html>'],
    ['malformed html', '<div><p>El diésel <h2'],
    ['unrelated page', '<html><body><h2>Deportes</h2><p>Gol de Honduras</p></body></html>'],
    ['non-string input', undefined],
    ['null input', null],
  ])('every parser returns null and never throws on %s', (_name, input) => {
    for (const parser of CATALOG) {
      expect(() => parser.parse(input, { today: '2026-10-04' }), parser.id).not.toThrow();
      expect(parser.parse(input, { today: '2026-10-04' }), parser.id).toBeNull();
    }
  });

  it('a missing context is a decline, not a throw', () => {
    for (const parser of CATALOG) expect(parser.parse(fixture(F_1005))).toBeNull();
  });
});

describe('parseDiesel dispatcher', () => {
  it('returns the id of the parser that fired, with its values and effective date', () => {
    expect(parseDiesel(fixture(F_1005), { today: '2026-10-04' })).toEqual({
      ok: true,
      id: 'sps-marker-galon+vigentes-a-partir',
      sps: 149.29,
      tegus: 153.53,
      effective: '2026-10-05',
    });
  });

  it.each(EXPECTED.filter((e, i, all) => all.findIndex((x) => x.file === e.file) === i))(
    'dispatches $file to its first matching parser: $id',
    ({ id, file, today, sps, tegus, effective }) => {
      expect(parseDiesel(fixture(file), { today })).toEqual({ ok: true, id, sps, tegus, effective });
    },
  );

  it('tries parsers in declared order and the first non-null result wins', () => {
    const calls = [];
    const decline = { id: 'a', parse: () => (calls.push('a'), null) };
    const first = { id: 'b', parse: () => (calls.push('b'), { sps: 1, tegus: 2, effective: '2026-10-05' }) };
    const never = { id: 'c', parse: () => (calls.push('c'), { sps: 9, tegus: 9, effective: '2026-10-05' }) };
    const r = parseDiesel('<html/>', { today: '2026-10-05', catalog: [decline, first, never] });
    expect(r).toEqual({ ok: true, id: 'b', sps: 1, tegus: 2, effective: '2026-10-05' });
    expect(calls).toEqual(['a', 'b']);
  });

  it('when every parser declines it fails loudly: no values, and it names how many were tried', () => {
    const r = parseDiesel('<html></html>', { today: '2026-10-04' });
    expect(r).toEqual({ ok: false, tried: CATALOG.length });
    expect(r.sps).toBeUndefined();
  });

  // R3.5: a new format is a new parser + fixture + test. Existing parsers are not
  // touched; the catalog is composed with one more entry.
  it('a new format is added without modifying existing parsers', () => {
    const extra = { id: 'future-format', parse: (html) => (html.includes('NUEVO') ? { sps: 150, tegus: 155, effective: '2026-10-05' } : null) };
    const catalog = [...CATALOG, extra];
    expect(parseDiesel('<p>NUEVO</p>', { today: '2026-10-05', catalog }).id).toBe('future-format');
    expect(parseDiesel(fixture(F_1005), { today: '2026-10-04', catalog }).id).toBe('sps-marker-galon+vigentes-a-partir');
  });
});

// Incident B (spec R3.4). The article behind the published pair 130.62 / 119.97 is
// F_0810. Reading it: San Pedro Sula diesel really is L130.62, but the figure
// 119.97 is the KEROSENE price of Tegucigalpa. The Tegucigalpa diesel is L134.25.
// The old heuristic took the LAST number of the diesel sentence ("...L134.25 por
// galón, mientras que el queroseno ... L119.97") and so labelled kerosene as
// Tegucigalpa diesel. The catalog must parse it correctly, never emit the pair.
describe('incident B article', () => {
  const result = () => parseDiesel(fixture(F_0810), { today: '2026-08-10' });

  it('parses correctly: sps 130.62, tegus 134.25 (119.97 is kerosene)', () => {
    const r = result();
    expect(r).toMatchObject({ ok: true, id: 'two-markers-galon+semana-que-inicia', sps: 130.62, tegus: 134.25 });
    expect(fixture(F_0810)).toContain('queroseno aumentará L4.31 para alcanzar los L119.97');
  });

  it('never emits the inverted pair that was published', () => {
    const r = result();
    expect(r.tegus).not.toBe(119.97);
    expect({ sps: r.sps, tegus: r.tegus }).not.toEqual({ sps: 130.62, tegus: 119.97 });
    expect(r.tegus).toBeGreaterThan(r.sps);
  });
});

// The old extractDieselPrice heuristic is gone. These tests are the reference for
// what it used to do wrong: they assert the catalog does NOT reproduce it.
describe('the old tolerant heuristic is not reproduced', () => {
  // It used to return {tegus: 151.1, sps: 146.85} for an article with only an SPS
  // marker and no stated effective date (pre-marker = tegus). The same article now
  // declines: with no effective date there is no way to know the numbers are current.
  it('a legacy SPS-only article without an effective date declines instead of guessing', () => {
    const legacy = article(
      p('El diésel regular cuesta L151.10 por galón.'),
      h2('Precios en San Pedro Sula'),
      p('El diésel regular cuesta L146.85 por galón.'),
    );
    expect(parseDiesel(legacy, { today: '2026-10-05' })).toEqual({ ok: false, tried: CATALOG.length });
  });

  // It used to take the LAST 30-500 number of the first diesel sentence, so a
  // trailing figure won: against the real 15/09 article it published sps=85.14. A
  // diesel price is now only the figure the sentence attaches to the diesel ("L<n>
  // por galón") before any other fuel; a trailing reference figure is ignored.
  it('a trailing unrelated number is not taken as the price', () => {
    const noisy = twoMarkers({ sps: 'L146.85' }).replace(
      'por galón.</p><h2>Precios en Tegucigalpa',
      'por galón, frente a 85.14 de referencia.</p><h2>Precios en Tegucigalpa',
    );
    const r = parseDiesel(noisy, { today: '2026-08-10' });
    expect(r).toMatchObject({ ok: true, sps: 146.85 });
    expect(r.sps).not.toBe(85.14);
  });

  it('a diesel sentence with no price attached declines rather than borrowing another fuel\'s number', () => {
    const kerosene = twoMarkers().replace(
      'El diésel registrará el mayor aumento, para ubicarse en L130.62 por galón.',
      'El diésel subirá, mientras que el queroseno costará L116.20 por galón.',
    );
    expect(parseDiesel(kerosene, { today: '2026-08-10' })).toEqual({ ok: false, tried: CATALOG.length });
  });

  it('two different diesel prices in one city block is ambiguous and declines', () => {
    const ambiguous = twoMarkers().replace(
      '</p><h2>Precios en Tegucigalpa',
      ' El diésel cuesta L99.99 por galón.</p><h2>Precios en Tegucigalpa',
    );
    expect(parseDiesel(ambiguous, { today: '2026-08-10' })).toEqual({ ok: false, tried: CATALOG.length });
  });

  it('the same price repeated in a block is not ambiguous', () => {
    const repeated = twoMarkers().replace(
      '</p><h2>Precios en Tegucigalpa',
      ' El diésel queda en L130.62 por galón.</p><h2>Precios en Tegucigalpa',
    );
    expect(parseDiesel(repeated, { today: '2026-08-10' })).toMatchObject({ ok: true, sps: 130.62 });
  });
});

// R: a parser that finds prices but cannot determine the effective date returns
// null. A partial result is not a result.
describe('effective date', () => {
  const parse = (html, today = '2026-08-10') => byId('two-markers-galon+semana-que-inicia').parse(html, { today });

  it('prices without an effective date: null, not a partial result', () => {
    expect(parse(twoMarkers({ date: 'Hay cambios de precios esta semana.' }))).toBeNull();
  });

  it.each([
    ['enero', '01'], ['febrero', '02'], ['marzo', '03'], ['abril', '04'], ['mayo', '05'], ['junio', '06'],
    ['julio', '07'], ['agosto', '08'], ['septiembre', '09'], ['setiembre', '09'], ['octubre', '10'],
    ['noviembre', '11'], ['diciembre', '12'],
  ])('maps the Spanish month %s to %s', (name, mm) => {
    const r = parse(twoMarkers({ date: `Para la semana que inicia el lunes 7 de ${name} de 2026.` }));
    expect(r.effective).toBe(`2026-${mm}-07`);
  });

  it('is case-insensitive for the month', () => {
    expect(parse(twoMarkers({ date: 'Para la semana que inicia el lunes 10 de Agosto.' })).effective).toBe('2026-08-10');
  });

  it('uses the year the article states', () => {
    expect(parse(twoMarkers({ date: 'Para la semana que inicia el lunes 5 de octubre de 2026.' }), '2026-10-04').effective).toBe('2026-10-05');
    expect(parse(twoMarkers({ date: 'Para la semana que inicia el lunes 5 de octubre de 2025.' }), '2026-10-04').effective).toBe('2025-10-05');
  });

  // The article often gives no year. It is inferred as the year that puts the date
  // nearest to today, so the December/January turn works in both directions.
  it('infers a missing year as the one nearest to today', () => {
    const at = (date, today) => parse(twoMarkers({ date: `Para la semana que inicia el lunes ${date}.` }), today).effective;
    expect(at('10 de agosto', '2026-08-12')).toBe('2026-08-10');
    expect(at('28 de diciembre', '2027-01-02')).toBe('2026-12-28');
    expect(at('4 de enero', '2026-12-30')).toBe('2027-01-04');
  });

  it('an impossible calendar day is a decline, not a rolled-over date', () => {
    expect(parse(twoMarkers({ date: 'Para la semana que inicia el lunes 31 de septiembre.' }))).toBeNull();
    expect(parse(twoMarkers({ date: 'Para la semana que inicia el lunes 30 de febrero de 2026.' }))).toBeNull();
  });

  it('two different effective dates for one phrasing is ambiguous and declines', () => {
    const html = twoMarkers({ date: 'Para la semana que inicia el lunes 10 de agosto. Para la semana que inicia el lunes 17 de agosto.' });
    expect(parse(html)).toBeNull();
  });

  it('is built from the matched parts: the day never moves with the host timezone', () => {
    // 2026-12-31 is the shape that shifts under a negative UTC offset when a Date is
    // built from a locale string. Parts in, ISO out.
    expect(parse(twoMarkers({ date: 'Para la semana que inicia el lunes 31 de diciembre de 2026.' }), '2026-12-30').effective).toBe('2026-12-31');
    expect(parse(twoMarkers({ date: 'Para la semana que inicia el lunes 1 de enero de 2027.' }), '2026-12-30').effective).toBe('2027-01-01');
  });
});

describe('city block layout', () => {
  it('ignores the newsletter widget heading that interrupts the article body', () => {
    const html = article(
      p('Para la semana que inicia el lunes 10 de agosto.'),
      h2('Precios en San Pedro Sula'),
      p('El diésel registrará el mayor aumento, para ubicarse en L130.62 por galón.'),
      h2('Boletín'),
      p('Recibirás diariamente las noticias.'),
      p('Más precios de San Pedro Sula.'),
      h2('Precios en Tegucigalpa'),
      p('El diésel se venderá a L134.25 por galón.'),
    );
    expect(parseDiesel(html, { today: '2026-08-10' })).toMatchObject({ ok: true, sps: 130.62, tegus: 134.25 });
  });

  it('a city block ends at the next ordinary heading, so sidebar text cannot leak in', () => {
    const html = article(
      p('Para la semana que inicia el lunes 10 de agosto.'),
      h2('Precios en San Pedro Sula'),
      p('El diésel registrará el mayor aumento, para ubicarse en L130.62 por galón.'),
      h2('Gobierno amplía apoyo'),
      p('El diésel costará L5.66 por galón de apoyo.'),
      h2('Precios en Tegucigalpa'),
      p('El diésel se venderá a L134.25 por galón.'),
    );
    expect(parseDiesel(html, { today: '2026-08-10' })).toMatchObject({ ok: true, sps: 130.62, tegus: 134.25 });
  });

  it('a duplicated city marker is ambiguous and declines', () => {
    const html = twoMarkers().replace('</div>', `${h2('Precios en San Pedro Sula')}${p('El diésel cuesta L100.00 por galón.')}</div>`);
    expect(parseDiesel(html, { today: '2026-08-10' })).toEqual({ ok: false, tried: CATALOG.length });
  });
});
