import { describe, expect, it } from 'vitest';
import { buildFile } from '../dataset.mjs';

// Golden output: this string is what the scraper writes to
// src/content/datasets/information.ts. Any change here is a dataset shape change.
const GOLDEN = `import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  updatedAt: '01/10/2026',
};

export const dollarMetrics: InfoMetric[] = [
  {
    label: 'Compra',
    value: 'L 26.8989',
    helper: 'Referencia de compra',
  },
  {
    label: 'Venta',
    value: 'L 27.0334',
    helper: 'Referencia de venta',
  },
];

export const dieselMetrics: InfoMetric[] = [
  {
    label: 'San Pedro Sula',
    value: 'L 149.20',
    helper: 'Por galón',
  },
  {
    label: 'Tegucigalpa',
    value: 'L 153.53',
    helper: 'Por galón',
  },
];
`;

describe('buildFile', () => {
  it('renders the exact dataset module', () => {
    const out = buildFile({
      updatedAt: '01/10/2026',
      dollar: { buy: 26.8989, sell: 27.0334 },
      diesel: { sps: 149.2, tegus: 153.53 },
    });
    expect(out).toBe(GOLDEN);
  });
});
