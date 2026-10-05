import { load } from 'cheerio';
import { parseNumber } from './format.mjs';

export const SOURCES = {
  ficohsa: {
    // La home tiene el bloque "Cambio del día" con valores que se actualizan a diario.
    // La antigua /tasas-de-cambio quedó congelada y dejó de actualizarse.
    url: 'https://www.ficohsa.hn/',
  },
  laprensa: {
    // La sección Honduras dejó de listar el artículo semanal de combustibles
    // en mayo 2026; pasaron a publicarlo bajo /economia/.
    section: 'https://www.laprensa.hn/economia',
    // El slug cambió de "precios-combustibles-..." a "gasolinas-..."
    // (mayo 2026). Aceptamos ambas keywords para tolerar futuras variantes.
    articleSlug: /\/(?:honduras|portada|economia)\/[a-z0-9-]*(?:combustibles|gasolinas)[a-z0-9-]*-[A-Z]{1,4}[0-9]+/,
  },
};

export function parseFicohsa(html) {
  const $ = load(html);
  // El bloque "Cambio del día" en la home tiene un contenedor `.values-uno` para
  // dólar (activo por default) con dos spans diferenciables por clase del padre.
  const $dolarBlock = $('.values-uno').first();
  if ($dolarBlock.length === 0) throw new Error('Ficohsa: bloque .values-uno no encontrado en la home.');
  const buyText = $dolarBlock.find('.gff-indicadores-divisas-v1__buys-value.value-one').first().text().trim();
  const sellText = $dolarBlock.find('.gff-indicadores-divisas-v1__sale-value.value-one').first().text().trim();
  if (!buyText || !sellText) throw new Error('Ficohsa: valores de Compra/Venta no encontrados.');
  const buy = parseNumber(buyText);
  const sell = parseNumber(sellText);
  return { buy, sell };
}

export function findLaPrensaArticlePath(sectionHtml) {
  const m = sectionHtml.match(SOURCES.laprensa.articleSlug);
  if (!m) throw new Error('La Prensa: artículo de precios no encontrado en /economia.');
  return m[0];
}

// ---------------------------------------------------------------------------
// La Prensa diesel: an ordered CATALOG of precise parsers.
//
// A parser knows exactly ONE article format: a city-block layout, a way of
// writing the price, and the phrase that format uses to state when the prices
// take effect. It takes the article HTML and returns { sps, tegus, effective }
// or null. Declining is normal; throwing is a bug (makeParser enforces totality).
//
// There is deliberately no fallback. If every parser declines the caller fails
// loudly; nothing guesses "the last number in a plausible range" (that heuristic
// published sps=85.14 and kerosene as Tegucigalpa diesel).
//
// Adding a format = a new entry in CATALOG (reusing a layout / date phrase when
// it fits, or adding a new one) + a verbatim fixture + a test. Existing entries
// are never edited.
// ---------------------------------------------------------------------------

const MONTHS = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6, julio: 7, agosto: 8,
  septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};
const pad = (n) => String(n).padStart(2, '0');
const utc = (y, m, d) => Date.UTC(y, m - 1, d);

// Real calendar day (31 de septiembre and 30 de febrero are not days).
function isRealDay(y, m, d) {
  const t = new Date(utc(y, m, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

// Many articles state "lunes 5 de octubre" without a year. The year is the one that
// puts the date nearest to `today`, so the December/January turn resolves both ways.
function inferYear(day, month, today) {
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!t) return null;
  const ty = Number(t[1]);
  const now = utc(ty, Number(t[2]), Number(t[3]));
  const candidates = [ty - 1, ty, ty + 1].filter((y) => isRealDay(y, month, day));
  candidates.sort((a, b) => Math.abs(utc(a, month, day) - now) - Math.abs(utc(b, month, day) - now));
  return candidates[0] ?? null;
}

// One effective-date phrasing. `lead` is the fixed wording before "<d> de <mes>".
// The ISO value is built from the matched parts, never from a Date parsed out of a
// locale string, so the host timezone can never shift the day. More than one distinct
// date for the same phrasing is ambiguous and declines.
function datePhrase(lead) {
  const source = `${lead}\\s+(\\d{1,2})\\s+de\\s+(${Object.keys(MONTHS).join('|')})\\b(?:\\s+de\\s+(\\d{4}))?`;
  return (texts, today) => {
    const found = new Set();
    for (const text of texts) {
      for (const m of text.matchAll(new RegExp(source, 'gi'))) {
        const day = Number(m[1]);
        const month = MONTHS[m[2].toLowerCase()];
        const year = m[3] ? Number(m[3]) : inferYear(day, month, today);
        if (year === null || !isRealDay(year, month, day)) return null;
        found.add(`${year}-${pad(month)}-${pad(day)}`);
      }
    }
    return found.size === 1 ? [...found][0] : null;
  };
}

const DATE = {
  vigentesAPartir: datePhrase(String.raw`vigentes\s+a\s+partir\s+del\s+lunes`),
  entraEnVigencia: datePhrase(String.raw`entrar[aá]\s+en\s+vigencia\s+a\s+partir\s+de\s+este\s+lunes`),
  semanaQueInicia: datePhrase(String.raw`semana\s+que\s+inicia\s+el\s+lunes`),
  vigentesDesde: datePhrase(String.raw`estar[aá]n\s+vigentes\s+desde\s+el\s+lunes`),
  desdeEsteLunes: datePhrase(String.raw`desde\s+este\s+lunes`),
  comenzaraAAplicarse: datePhrase(String.raw`comenzar[aá]\s+a\s+aplicarse\s+este\s+lunes`),
};

// A diesel price is the figure the sentence attaches to the diesel, written in this
// format's style, with no other fuel named in between ("el diésel ... y el queroseno
// ... L119.97" must not yield the kerosene price).
const PRICE = {
  galon: String.raw`\bL\s?(\d{1,3}\.\d{2})\s+por\s+gal[oó]n`,
  lempiras: String.raw`(?<![\d.])(\d{1,3}\.\d{2})\s+lempiras`,
};
const OTHER_FUEL = String.raw`queroseno|kerosene|gasolina|glp|\bgas\b`;

function dieselPrice(paragraphs, style) {
  const re = new RegExp(String.raw`di[eé]sel(?:(?!${OTHER_FUEL})[\s\S])*?${PRICE[style]}`, 'i');
  const found = new Set();
  for (const sentence of paragraphs.flatMap((t) => t.split(/\.\s+/))) {
    const m = re.exec(sentence);
    if (m) found.add(m[1]);
  }
  // Two different diesel prices in one city block is ambiguous: decline.
  return found.size === 1 ? Number([...found][0]) : null;
}

const SPS_MARKER = /^(?:precios|combustibles)\s+en\s+san\s+pedro\s+sula$/i;
const TEGUS_MARKER = /^(?:precios|combustibles)\s+en\s+(?:tegucigalpa|la\s+capital(?:\s+hondure[ñn]a)?)$/i;
const NEWSLETTER = /^bolet[ií]n$/i;

// Paragraph texts after heading `i`, up to the next heading. The "Boletín" widget
// heading is injected mid-article and does not end a block.
function sectionAfter(items, i) {
  const out = [];
  for (const it of items.slice(i + 1)) {
    if (it.tag === 'h2') {
      if (NEWSLETTER.test(it.text)) continue;
      break;
    }
    out.push(it.text);
  }
  return out;
}
const leadBefore = (items, i) => items.slice(0, i).filter((it) => it.tag === 'p').map((it) => it.text);

// City-block layouts. Each returns the paragraphs of each city, or null.
const LAYOUT = {
  // Both city headings present: each block runs from its heading to the next heading.
  twoMarkers: (items, at) =>
    at.sps.length === 1 && at.tegus.length === 1
      ? { sps: sectionAfter(items, at.sps[0]), tegus: sectionAfter(items, at.tegus[0]) }
      : null,
  // Only the capital heading (28/09): San Pedro Sula comes first, with no heading.
  tegusMarker: (items, at) =>
    at.tegus.length === 1 && at.sps.length === 0
      ? { sps: leadBefore(items, at.tegus[0]), tegus: sectionAfter(items, at.tegus[0]) }
      : null,
  // Only the San Pedro Sula heading (05/10): Tegucigalpa comes first, with no heading.
  spsMarker: (items, at) =>
    at.sps.length === 1 && at.tegus.length === 0
      ? { tegus: leadBefore(items, at.sps[0]), sps: sectionAfter(items, at.sps[0]) }
      : null,
};

function makeParser(id, layout, style, readDate) {
  return {
    id,
    parse(html, ctx) {
      try {
        if (typeof html !== 'string' || typeof ctx?.today !== 'string') return null;
        const $ = load(html);
        const clean = (el) => $(el).text().replace(/\s+/g, ' ').trim();
        const items = $('.paragraph p, h2')
          .toArray()
          .map((el) => ({ tag: el.tagName, text: clean(el) }));
        const at = {
          sps: items.flatMap((it, i) => (it.tag === 'h2' && SPS_MARKER.test(it.text) ? [i] : [])),
          tegus: items.flatMap((it, i) => (it.tag === 'h2' && TEGUS_MARKER.test(it.text) ? [i] : [])),
        };
        const blocks = layout(items, at);
        if (!blocks) return null;
        const sps = dieselPrice(blocks.sps, style);
        const tegus = dieselPrice(blocks.tegus, style);
        if (sps === null || tegus === null) return null;
        // A parser that finds prices but not the effective date has no result.
        const texts = $('h1, .paragraph p').toArray().map(clean);
        const effective = readDate(texts, ctx.today);
        return effective ? { sps, tegus, effective } : null;
      } catch {
        return null;
      }
    },
  };
}

export const CATALOG = [
  makeParser('sps-marker-galon+vigentes-a-partir', LAYOUT.spsMarker, 'galon', DATE.vigentesAPartir),
  makeParser('tegus-marker-galon+entra-en-vigencia', LAYOUT.tegusMarker, 'galon', DATE.entraEnVigencia),
  makeParser('two-markers-galon+semana-que-inicia', LAYOUT.twoMarkers, 'galon', DATE.semanaQueInicia),
  makeParser('two-markers-lempiras+vigentes-desde', LAYOUT.twoMarkers, 'lempiras', DATE.vigentesDesde),
  makeParser('tegus-marker-galon+desde-este-lunes', LAYOUT.tegusMarker, 'galon', DATE.desdeEsteLunes),
  makeParser('sps-marker-galon+comenzara-a-aplicarse', LAYOUT.spsMarker, 'galon', DATE.comenzaraAAplicarse),
];

/**
 * Tries the catalog in declared order. The first non-null result wins and is returned
 * with the id of the parser that fired. If every parser declines the caller gets
 * { ok: false, tried } and must fail loudly; there is no guess.
 * `today` (ISO) is only used to resolve a year the article leaves out.
 */
export function parseDiesel(html, { today, catalog = CATALOG } = {}) {
  for (const parser of catalog) {
    const result = parser.parse(html, { today });
    if (result) return { ok: true, id: parser.id, ...result };
  }
  return { ok: false, tried: catalog.length };
}
