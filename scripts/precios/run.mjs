import { appendFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { todayISO } from './format.mjs';
import { buildFile, readPrevious, targetFile } from './dataset.mjs';
import { decideOutcome, renderReport } from './report.mjs';
import { blockMessage, checkEffectiveDate, invalidOverrideMessage, missingBaseline, resolveOverride, validateGroup } from './validate.mjs';
import { SOURCES, findLaPrensaArticlePath, parseDiesel, parseFicohsa } from './parsers.mjs';

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

async function scrapeLaPrensa(today) {
  const sectionHtml = await fetchHtml(SOURCES.laprensa.section);
  const articlePath = findLaPrensaArticlePath(sectionHtml);
  const articleUrl = `https://www.laprensa.hn${articlePath}`;
  console.log('La Prensa artículo:', articleUrl);

  const result = parseDiesel(await fetchHtml(articleUrl), { today });
  if (!result.ok) {
    // No fallback and no guess: an article no parser knows is a loud failure.
    throw new Error(`ningún parser reconoció el artículo (se probaron ${result.tried}). No se publica el diésel.`);
  }
  console.log('La Prensa parser:', result.id);
  return { sps: result.sps, tegus: result.tegus, parser: result.id, effective: result.effective };
}

const NO_BASELINE = { dollar: { buy: null, sell: null }, diesel: { sps: null, tegus: null } };
// Metadata keys of a group; everything else is a numeric value that must be present.
const META_KEYS = ['date', 'parser'];

const complete = (v) =>
  Object.entries(v)
    .filter(([k]) => !META_KEYS.includes(k))
    .every(([, x]) => typeof x === 'number' && Number.isFinite(x));

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

// `today` is injectable so tests never depend on the clock.
export async function run({ readPreviousFn = readPrevious, env = process.env, today = todayISO() } = {}) {
  const dryRun = process.argv.includes('--dry-run');

  // Total reader: never throws; an unreadable file is an empty snapshot.
  const previous = await readPreviousFn();
  const baseline = previous.legacy ? NO_BASELINE : previous;
  const todayIso = today;
  const override = resolveOverride(env.PRECIOS_OVERRIDE, todayIso);
  if (override && !override.ok) console.warn(invalidOverrideMessage(override));

  let dollarFresh = null;
  try {
    dollarFresh = await scrapeFicohsa();
  } catch (err) {
    console.warn('Ficohsa falló:', err.message);
  }

  let dieselFresh = null;
  let dieselMeta = null;
  try {
    const scraped = await scrapeLaPrensa(todayIso);
    dieselFresh = { sps: scraped.sps, tegus: scraped.tegus };
    dieselMeta = { parser: scraped.parser, effective: scraped.effective };
  } catch (err) {
    console.warn('La Prensa falló:', err.message);
  }

  // The parser id that produced the diesel is the provenance shown in block messages.
  const ctx = { today: todayIso, provenance: dieselMeta?.parser ?? 'desconocido' };
  const dollarJudge = judge('dollar', dollarFresh, baseline.dollar, override, ctx);

  // Announced price vs price in effect. The article states when its prices take effect.
  //   pending: not in effect yet (Friday to Sunday). The announcement is not validated
  //     or published; the current value stands. The scrape succeeded and the value is
  //     still the one in effect, so the metric date advances (R-F1), and the run is green.
  //   stale: the date is too old to be this week's article. Hard block, not overridable.
  const effective = dieselMeta ? checkEffectiveDate(dieselMeta.effective, todayIso) : null;
  const pending = effective?.status === 'pending';
  let dieselJudge;
  if (pending) {
    console.log(
      `El artículo anuncia precios vigentes desde ${effective.effective}: aún no rigen. Se conserva el valor vigente del diésel y su fecha avanza a hoy.`,
    );
    dieselJudge = { publish: true, blocked: [], overridden: [], overrideUsed: [] };
  } else if (effective?.status === 'stale') {
    console.error(blockMessage(effective.block, ctx));
    dieselJudge = { publish: false, blocked: [effective.block], overridden: [], overrideUsed: [] };
  } else {
    dieselJudge = judge('diesel', dieselFresh, baseline.diesel, override, ctx);
  }

  // Freshness is per group: the date of the last successful scrape + validation of
  // THAT group. A published group is stamped today even if its value is unchanged. A
  // group that is not published keeps its previous value AND its previous date,
  // never today (incident A).
  const dollar = dollarJudge.publish ? { ...dollarFresh, date: todayIso } : previous.dollar;
  const diesel = pending
    ? { ...previous.diesel, date: todayIso }
    : dieselJudge.publish
      ? { ...dieselFresh, date: todayIso, parser: dieselMeta.parser }
      : previous.diesel;

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
  // A carried value with no known observation date is not republished either: with no
  // honest date it cannot be shown as current, and today would repeat incident A.
  const groups = { dollar, diesel };
  const carriedUndated = Object.entries(groups).filter(
    ([name, g]) => !(name === 'dollar' ? dollarJudge : dieselJudge).publish && complete(g) && !g.date,
  );
  for (const [name] of carriedUndated) {
    degradedReasons.push(`stale-date-unknown:${name}`);
    console.error(`No se republica el ${name}: el valor previo no tiene fecha de observación conocida.`);
  }
  const hasValues = complete(dollar) && complete(diesel);
  if (!hasValues) console.error('No hay valor previo para conservar el grupo no publicado.');
  const buildable = hasValues && carriedUndated.length === 0;

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

  console.log('dollar', dollar, `(${dollarJudge.publish ? 'ficohsa' : 'previous'})`);
  console.log('diesel', diesel, `(${dieselJudge.publish && !pending ? 'laprensa' : 'previous'})`);

  const next = buildFile({ dollar, diesel, override: override?.ok ? `${override.id}:${override.expires}` : null });
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
