import { appendFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { today } from './format.mjs';
import { buildFile, readPrevious, targetFile } from './dataset.mjs';
import { decideOutcome, renderReport } from './report.mjs';
import { SOURCES, findLaPrensaArticlePath, parseFicohsa, parseLaPrensa } from './parsers.mjs';

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

export async function run() {
  const dryRun = process.argv.includes('--dry-run');

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

  const degradedReasons = [];
  if (dollarSource === 'previous') degradedReasons.push('source-failed:ficohsa');
  if (dieselSource === 'previous') degradedReasons.push('source-failed:laprensa');

  // Publishable partial run => exit 0 (the commit step must still run); the job
  // goes red afterwards through the `degraded` output. Nothing publishable =>
  // exitCode 1 and no write. See report.mjs.
  const outcome = decideOutcome({
    published: dollarSource !== 'previous' || dieselSource !== 'previous',
    degradedReasons,
  });
  const report = renderReport(outcome);
  for (const line of report.annotations) console.log(line);
  if (process.env.GITHUB_OUTPUT && report.outputLines.length > 0) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${report.outputLines.join('\n')}\n`);
  }
  if (!outcome.write) {
    console.error('Ambas fuentes fallaron. Sin actualización.');
    process.exitCode = outcome.exitCode;
    return;
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
