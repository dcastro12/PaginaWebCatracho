import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { formatLempira } from './format.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const targetFile = path.resolve(__dirname, '..', '..', 'src/content/datasets/information.ts');

export async function readPrevious() {
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

export function buildFile({ updatedAt, dollar, diesel }) {
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
