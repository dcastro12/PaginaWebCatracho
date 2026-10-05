import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatLempira } from './format.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const targetFile = path.resolve(__dirname, '..', '..', 'src/content/datasets/information.ts');

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

// A date is only trusted if it is a real ISO calendar day (the shape <time datetime>
// needs). Anything else, including the legacy dd/mm/yyyy, is "unknown", never a guess.
const isoDate = (v) => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return null;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v ? v : null;
};

// A parser id is a short slug like `two-markers-galon+semana-que-inicia`. Anything
// else read back from the file is not trusted as provenance.
const parserId = (v) => (typeof v === 'string' && /^[a-z0-9+-]+$/.test(v) ? v : null);

const emptySnapshot = () => ({
  dollar: { buy: null, sell: null, date: null },
  diesel: { sps: null, tegus: null, date: null, parser: null },
  override: null,
  legacy: false,
});

// Pre-JSON files: one independent, failure-tolerant regex per field over the UI arrays.
function parseLegacy(content) {
  const grab = (label) => {
    const m = content.match(new RegExp(`label:\\s*'${label}',\\s*\\n?\\s*value:\\s*'L\\s*([\\d.]+)'`));
    return m ? num(parseFloat(m[1])) : null;
  };
  const found = {
    // The legacy shared updatedAt says when the FILE was written, not when each group
    // was observed (incident A), so per-group dates stay unknown on this path.
    dollar: { buy: grab('Compra'), sell: grab('Venta'), date: null },
    diesel: { sps: grab('San Pedro Sula'), tegus: grab('Tegucigalpa'), date: null, parser: null },
    override: null,
    legacy: true,
  };
  const any = [...Object.values(found.dollar), ...Object.values(found.diesel)].some((v) => v !== null);
  return any ? found : emptySnapshot();
}

/**
 * Total: never throws. The scraper-owned `informationSnapshot` is a JSON-compatible
 * literal (see buildFile), extracted with ONE regex and JSON.parse'd. Every field is
 * independently optional (missing -> null). A file without a JSON snapshot (the
 * pre-change shape) falls back to the legacy per-field reader and is flagged
 * `legacy`, so callers can skip Tier D. Not import()ed: information.ts is
 * TypeScript and the workflow has no build step.
 */
export function parsePrevious(content) {
  try {
    const literal = /export const informationSnapshot = (\{[\s\S]*?\n\});/.exec(content);
    let snap = null;
    if (literal) {
      try {
        snap = JSON.parse(literal[1]);
      } catch {
        snap = null;
      }
    }
    if (snap && typeof snap === 'object' && !Array.isArray(snap)) {
      return {
        dollar: { buy: num(snap.dollar?.buy), sell: num(snap.dollar?.sell), date: isoDate(snap.dollar?.date) },
        diesel: {
          sps: num(snap.diesel?.sps),
          tegus: num(snap.diesel?.tegus),
          date: isoDate(snap.diesel?.date),
          parser: parserId(snap.diesel?.parser),
        },
        override: typeof snap.override === 'string' ? snap.override : null,
        legacy: false,
      };
    }
    return parseLegacy(String(content));
  } catch {
    return emptySnapshot();
  }
}

export async function readPrevious(file = targetFile) {
  try {
    return parsePrevious(await readFile(file, 'utf8'));
  } catch {
    return emptySnapshot();
  }
}

export function buildFile({ dollar, diesel, override = null }) {
  // JSON-compatible literal (double quotes, no trailing commas) so readPrevious can
  // JSON.parse it. No formatter is configured, so nothing rewrites it. Keep it
  // low-cardinality: values, one ISO date per group and `id:expiry` only, or the
  // no-change guard breaks. Each date is the last successful scrape + validation of
  // THAT group; there is deliberately no shared date. Provenance is the source id plus,
  // for diesel, the id of the parser that produced the value (design 4): strategy and
  // source ids ONLY. A timestamp, run id or counter here would change the file on every
  // run and defeat the prev === next guard.
  const snapshot = JSON.stringify(
    {
      dollar: { buy: dollar.buy, sell: dollar.sell, date: dollar.date, source: 'ficohsa' },
      diesel: { sps: diesel.sps, tegus: diesel.tegus, date: diesel.date, source: 'laprensa', parser: diesel.parser ?? null },
      override,
    },
    null,
    2,
  );
  return `import type { InfoMetric } from '../../types/content';

export const informationSnapshot = ${snapshot};

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
