#!/usr/bin/env node
/**
 * Actualiza src/content/datasets/information.ts con los valores vigentes de
 * tipo de cambio (BCH) y precios de diésel (SEFIN).
 *
 * Uso:
 *   node scripts/update-precios.mjs            (escribe el archivo)
 *   node scripts/update-precios.mjs --dry-run  (solo imprime lo que haría)
 *
 * Si cualquiera de los selectores falla, el script sale con código != 0 y
 * NO toca el archivo. Eso deja que la Action de GitHub avise por fallo.
 */
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { load } from 'cheerio';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const targetFile = path.resolve(__dirname, '..', 'src/content/datasets/information.ts');
const dryRun = process.argv.includes('--dry-run');

// Los selectores se declaran acá para que sean ajustables sin tocar la lógica.
// Si BCH o SEFIN cambian su markup, esta es la única zona que hay que revisar.
const SOURCES = {
  bch: {
    url: 'https://www.bch.hn/tipo-de-cambio',
    pickBuy: ($) => $('table').first().find('td').eq(1).text().trim(),
    pickSell: ($) => $('table').first().find('td').eq(3).text().trim(),
  },
  sefin: {
    url: 'https://www.sefin.gob.hn/precios-de-combustibles/',
    pickSps: ($) => $('td:contains("San Pedro Sula") + td:contains("Diesel") + td').first().text().trim(),
    pickTegus: ($) => $('td:contains("Tegucigalpa") + td:contains("Diesel") + td').first().text().trim(),
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

async function scrapeBch() {
  const html = await fetchHtml(SOURCES.bch.url);
  const $ = load(html);
  const buy = parseNumber(SOURCES.bch.pickBuy($));
  const sell = parseNumber(SOURCES.bch.pickSell($));
  return { buy, sell };
}

async function scrapeSefin() {
  const html = await fetchHtml(SOURCES.sefin.url);
  const $ = load(html);
  const sps = parseNumber(SOURCES.sefin.pickSps($));
  const tegus = parseNumber(SOURCES.sefin.pickTegus($));
  return { sps, tegus };
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
  const [dollar, diesel] = await Promise.all([scrapeBch(), scrapeSefin()]);
  const updatedAt = today();
  console.log('updatedAt', updatedAt);
  console.log('dollar', dollar);
  console.log('diesel', diesel);
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
