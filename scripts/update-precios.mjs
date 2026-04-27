#!/usr/bin/env node
/**
 * Actualiza src/content/datasets/information.ts con los valores vigentes de
 * tipo de cambio (Ficohsa) y precios de diésel (La Prensa, vía artículo
 * más reciente sobre combustibles publicado por la Secretaría de Energía).
 *
 * Uso:
 *   node scripts/update-precios.mjs            (escribe el archivo)
 *   node scripts/update-precios.mjs --dry-run  (solo imprime lo que haría)
 *
 * Cada fuente se intenta de forma independiente. Si una falla pero la otra
 * funciona, los valores fallidos quedan con su último valor conocido y la
 * fecha sí se actualiza. Si AMBAS fallan, el script sale con código != 0
 * y no toca el archivo.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetFile = path.resolve(__dirname, '..', 'src/content/datasets/information.ts');
const dryRun = process.argv.includes('--dry-run');

const SOURCES = {
  ficohsa: {
    url: 'https://www.ficohsa.hn/tasas-de-cambio',
  },
  laprensa: {
    section: 'https://www.laprensa.hn/honduras',
    articleSlug: /\/(?:honduras|portada|economia)\/precios-combustibles-[a-z0-9-]+-[A-Z]{1,4}[0-9]+/,
    spsMarker: /precios de los combustibles en san pedro sula/i,
  },
};

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CATRACHO-precios-bot/1.0 (+https://catrachohn.com)' },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return await res.text();
}

function parseNumber(raw) {
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const n = Number(cleaned);
  if (!Number.isFinite(n)) throw new Error(`Valor no numérico: "${raw}"`);
  return n;
}

function formatLempira(n, decimals) {
  return `L ${n.toFixed(decimals)}`;
}

function today() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

async function readPrevious() {
  const content = await readFile(targetFile, 'utf8');
  const grab = (label) => {
    const re = new RegExp(`label:\\s*'${label}',\\s*\\n?\\s*value:\\s*'L\\s*([\\d.]+)'`);
    const m = content.match(re);
    if (!m) throw new Error(`No pude leer valor previo de "${label}"`);
    return parseFloat(m[1]);
  };
  return {
    dollar: { buy: grab('Compra'), sell: grab('Venta') },
    diesel: { sps: grab('San Pedro Sula'), tegus: grab('Tegucigalpa') },
  };
}

async function scrapeFicohsa() {
  const html = await fetchHtml(SOURCES.ficohsa.url);
  const $ = load(html);
  const $dolar = $('.tipo-cambio__currency')
    .filter((_, el) => $(el).find('.tipo-cambio__currency-title').text().trim().toLowerCase().startsWith('dólar'))
    .first();
  if ($dolar.length === 0) throw new Error('Ficohsa: bloque del dólar no encontrado.');
  const buyText = $dolar.find('.tipo-cambio__rate-line').eq(0).find('.tipo-cambio__value').text().trim();
  const sellText = $dolar.find('.tipo-cambio__rate-line').eq(1).find('.tipo-cambio__value').text().trim();
  const buy = parseNumber(buyText);
  const sell = parseNumber(sellText);
  return { buy, sell };
}

function extractDieselPrice(text, label) {
  const sentences = text.split(/\.\s+|\n+/);
  for (const s of sentences) {
    if (!/di[eé]sel/i.test(s)) continue;
    const numbers = (s.match(/\d{1,3}\.\d{2}/g) || []).map((x) => parseFloat(x));
    const candidates = numbers.filter((n) => n > 30 && n < 500);
    if (candidates.length > 0) {
      return candidates[candidates.length - 1];
    }
  }
  throw new Error(`La Prensa: precio de diésel para "${label}" no encontrado.`);
}

async function scrapeLaPrensa() {
  const sectionHtml = await fetchHtml(SOURCES.laprensa.section);
  const m = sectionHtml.match(SOURCES.laprensa.articleSlug);
  if (!m) throw new Error('La Prensa: artículo de precios no encontrado en /honduras.');
  const articleUrl = `https://www.laprensa.hn${m[0]}`;
  console.log('La Prensa artículo:', articleUrl);

  const articleHtml = await fetchHtml(articleUrl);
  const $ = load(articleHtml);

  const items = $('.paragraph p, h2.intertitle, h2').toArray();
  const splitIndex = items.findIndex((el) => SOURCES.laprensa.spsMarker.test($(el).text()));
  if (splitIndex === -1) throw new Error('La Prensa: separador "Precios ... San Pedro Sula" no encontrado.');

  const tegusText = items.slice(0, splitIndex).map((el) => $(el).text()).join(' ');
  const spsText = items.slice(splitIndex).map((el) => $(el).text()).join(' ');

  const tegus = extractDieselPrice(tegusText, 'Tegucigalpa');
  const sps = extractDieselPrice(spsText, 'San Pedro Sula');
  return { tegus, sps };
}

function buildFile({ updatedAt, dollar, diesel }) {
  return `import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  updatedAt: '${updatedAt}',
};

export const dollarMetrics: InfoMetric[] = [
  {
    label: 'Compra',
    value: '${formatLempira(dollar.buy, 4)}',
    helper: 'Referencia de compra',
  },
  {
    label: 'Venta',
    value: '${formatLempira(dollar.sell, 4)}',
    helper: 'Referencia de venta',
  },
];

export const dieselMetrics: InfoMetric[] = [
  {
    label: 'San Pedro Sula',
    value: '${formatLempira(diesel.sps, 2)}',
    helper: 'Por galón',
  },
  {
    label: 'Tegucigalpa',
    value: '${formatLempira(diesel.tegus, 2)}',
    helper: 'Por galón',
  },
];
`;
}

async function main() {
  const previous = await readPrevious();

  let dollar = previous.dollar;
  let dollarSource = 'previous';
  try {
    dollar = await scrapeFicohsa();
    dollarSource = 'ficohsa';
  } catch (err) {
    console.warn('Ficohsa falló:', err.message);
  }

  let diesel = previous.diesel;
  let dieselSource = 'previous';
  try {
    diesel = await scrapeLaPrensa();
    dieselSource = 'laprensa';
  } catch (err) {
    console.warn('La Prensa falló:', err.message);
  }

  if (dollarSource === 'previous' && dieselSource === 'previous') {
    throw new Error('Ambas fuentes fallaron. Sin actualización.');
  }

  const updatedAt = today();
  console.log('updatedAt', updatedAt);
  console.log('dollar', dollar, `(source: ${dollarSource})`);
  console.log('diesel', diesel, `(source: ${dieselSource})`);

  const next = buildFile({ updatedAt, dollar, diesel });
  if (dryRun) {
    console.log('--- dry run: archivo propuesto ---');
    console.log(next);
    return;
  }
  const prev = await readFile(targetFile, 'utf8');
  if (prev === next) {
    console.log('Sin cambios. No se reescribe.');
    return;
  }
  await writeFile(targetFile, next, 'utf8');
  console.log('Archivo actualizado:', targetFile);
}

main().catch((err) => {
  console.error('update-precios failed:', err.message);
  process.exit(1);
});
