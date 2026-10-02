import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  "updatedAt": "02/10/2026",
  "dollar": {
    "buy": 26.8925,
    "sell": 27.027
  },
  "diesel": {
    "sps": 149.2,
    "tegus": 153.53
  },
  "override": null
};

export const dollarMetrics: InfoMetric[] = [
  {
    label: 'Compra',
    value: 'L 26.8925',
    helper: 'Referencia de compra',
  },
  {
    label: 'Venta',
    value: 'L 27.0270',
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
