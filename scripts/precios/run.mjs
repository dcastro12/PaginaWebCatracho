import { appendFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { today, todayISO } from './format.mjs';
import { buildFile, readPrevious, targetFile } from './dataset.mjs';
import { decideOutcome, renderReport } from './report.mjs';
import { blockMessage, invalidOverrideMessage, missingBaseline, resolveOverride, validateGroup } from './validate.mjs';
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

// Parser provenance is a constant until slice 3 introduces named strategies.
const PROVENANCE = 'legacy';
const NO_BASELINE = { dollar: { buy: null, sell: null }, diesel: { sps: null, tegus: null } };

const complete = (v) => Object.values(v).every((x) => typeof x === 'number' && Number.isFinite(x));

// Validates one freshly scraped group. A group fails as a unit and never affects the
// other. The override is resolved elsewhere and only consulted for overridable invariants.
function judge(group, fresh, baseline, override, ctx) {
  if (!fresh) return { publish: false, blocked: [], overridden: [], overrideUsed: [] };
  const missing = missingBaseline(fresh, baseline);
  if (missing.length > 0) {
    console.log(`Tier D omitido para ${group}: sin valor previo de ${missing.join(', ')}.`);
  }
  const { blocked, overridden } = validateGroup(group, fresh, baseline, override);
  for (const b of blocked) console.error(blockMessage(b, ctx));
  const publish = blocked.length === 0;
  if (publish) for (const o of overridden) console.log(`Override aplicado: invariante "${o.id}".`);
  // `overridden` = bypassed AND published (drives override-applied); `overrideUsed` =
  // the override bypassed an invariant, whether or not the group was then published.
  return { publish, blocked, overridden: publish ? overridden : [], overrideUsed: overridden };
}

export async function run({ readPreviousFn = readPrevious, env = process.env } = {}) {
  const dryRun = process.argv.includes('--dry-run');

  // Total reader: never throws; an unreadable file is an empty snapshot.
  const previous = await readPreviousFn();
  const baseline = previous.legacy ? NO_BASELINE : previous;
  const todayIso = todayISO();
  const override = resolveOverride(env.PRECIOS_OVERRIDE, todayIso);
  if (override && !override.ok) console.warn(invalidOverrideMessage(override));
  const ctx = { today: todayIso, provenance: PROVENANCE };

  let dollarFresh = null;
  try {
    dollarFresh = await scrapeFicohsa();
  } catch (err) {
    console.warn('Ficohsa falló:', err.message);
  }

  let dieselFresh = null;
  try {
    dieselFresh = await scrapeLaPrensa();
  } catch (err) {
    console.warn('La Prensa falló:', err.message);
  }

  const dollarJudge = judge('dollar', dollarFresh, baseline.dollar, override, ctx);
  const dieselJudge = judge('diesel', dieselFresh, baseline.diesel, override, ctx);

  // A group that is not published keeps its previous value (if there is one).
  const dollar = dollarJudge.publish ? dollarFresh : previous.dollar;
  const diesel = dieselJudge.publish ? dieselFresh : previous.diesel;

  const degradedReasons = [];
  if (!dollarFresh) degradedReasons.push('source-failed:ficohsa');
  if (!dieselFresh) degradedReasons.push('source-failed:laprensa');
  for (const j of [dollarJudge, dieselJudge]) {
    for (const b of j.blocked) degradedReasons.push(`blocked:${b.id}`);
    for (const o of j.overridden) degradedReasons.push(`override-applied:${o.id}`);
  }
  // Advisory path: a message without a verdict, it never reaches `degraded`. Two
  // cases. Never fired: the override was not needed. Used but the group stayed
  // blocked (job already red via blocked:<id>): say it applied and was not enough.
  const judges = [dollarJudge, dieselJudge];
  const used = judges.some((j) => j.overrideUsed.length > 0);
  const published = judges.some((j) => j.overridden.length > 0);
  let advisories = [];
  if (override?.ok && !used) {
    advisories = [`PRECIOS_OVERRIDE activo (${override.id} hasta ${override.expires}) pero no fue necesario hoy.`];
  } else if (override?.ok && !published) {
    advisories = [
      `PRECIOS_OVERRIDE (${override.id} hasta ${override.expires}) se aplicó pero no alcanzó: el grupo sigue bloqueado por otra invariante.`,
    ];
  }

  // A blocked group with no carried value cannot be written (the file is regenerated
  // wholesale), so that run publishes nothing.
  const buildable = complete(dollar) && complete(diesel);
  if (!buildable) console.error('No hay valor previo para conservar el grupo no publicado.');

  // Publishable partial run => exit 0 (the commit step must still run); the job
  // goes red afterwards through the `degraded` output. Nothing publishable =>
  // exitCode 1 and no write. See report.mjs.
  const outcome = decideOutcome({
    published: buildable && (dollarJudge.publish || dieselJudge.publish),
    degradedReasons,
    advisories,
  });
  const report = renderReport(outcome);
  for (const line of report.annotations) console.log(line);
  if (process.env.GITHUB_OUTPUT && report.outputLines.length > 0) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${report.outputLines.join('\n')}\n`);
  }
  if (!outcome.write) {
    console.error('Sin valores publicables. Sin actualización.');
    process.exitCode = outcome.exitCode;
    return;
  }

  const updatedAt = today();
  console.log('updatedAt', updatedAt);
  console.log('dollar', dollar, `(${dollarJudge.publish ? 'ficohsa' : 'previous'})`);
  console.log('diesel', diesel, `(${dieselJudge.publish ? 'laprensa' : 'previous'})`);

  const next = buildFile({ updatedAt, dollar, diesel, override: override?.ok ? `${override.id}:${override.expires}` : null });
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
