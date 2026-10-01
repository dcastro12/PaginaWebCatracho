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
import { today } from './precios/format.mjs';
import { buildFile, readPrevious, targetFile } from './precios/dataset.mjs';
import { SOURCES, findLaPrensaArticlePath, parseFicohsa, parseLaPrensa } from './precios/parsers.mjs';

const dryRun = process.argv.includes('--dry-run');

async function fetchHtml(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'CATRACHO-precios-bot/1.0 (+https://catrachohn.com)' },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return await res.text();
}

async function scrapeFicohsa() {
  return parseFicohsa(await fetchHtml(SOURCES.ficohsa.url));
}

async function scrapeLaPrensa() {
  const sectionHtml = await fetchHtml(SOURCES.laprensa.section);
  const articlePath = findLaPrensaArticlePath(sectionHtml);
  const articleUrl = `https://www.laprensa.hn${articlePath}`;
  console.log('La Prensa artículo:', articleUrl);

  return parseLaPrensa(await fetchHtml(articleUrl));
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
