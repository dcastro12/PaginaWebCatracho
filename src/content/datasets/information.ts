import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  "dollar": {
    "buy": 26.8901,
    "sell": 27.0246,
    "date": "2026-10-03"
  },
  "diesel": {
    "sps": 149.2,
    "tegus": 153.53,
    "date": "2026-09-28"
  },
  "override": null
};

export const dollarMetrics: InfoMetric[] = [
  {
    label: 'Compra',
    value: 'L 26.8901',
    helper: 'Referencia de compra',
  },
  {
    label: 'Venta',
    value: 'L 27.0246',
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
