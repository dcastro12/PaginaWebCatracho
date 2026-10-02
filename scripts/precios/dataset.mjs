import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatLempira } from './format.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const targetFile = path.resolve(__dirname, '..', '..', 'src/content/datasets/information.ts');

const num = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const emptySnapshot = () => ({
  dollar: { buy: null, sell: null },
  diesel: { sps: null, tegus: null },
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
    dollar: { buy: grab('Compra'), sell: grab('Venta') },
    diesel: { sps: grab('San Pedro Sula'), tegus: grab('Tegucigalpa') },
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
        dollar: { buy: num(snap.dollar?.buy), sell: num(snap.dollar?.sell) },
        diesel: { sps: num(snap.diesel?.sps), tegus: num(snap.diesel?.tegus) },
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

export function buildFile({ updatedAt, dollar, diesel, override = null }) {
  // JSON-compatible literal (double quotes, no trailing commas) so readPrevious can
  // JSON.parse it. No formatter is configured, so nothing rewrites it. Keep it
  // low-cardinality: values, a date and `id:expiry` only, or the no-change guard breaks.
  const snapshot = JSON.stringify(
    {
      updatedAt,
      dollar: { buy: dollar.buy, sell: dollar.sell },
      diesel: { sps: diesel.sps, tegus: diesel.tegus },
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
