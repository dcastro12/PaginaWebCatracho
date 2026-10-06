import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  "dollar": {
    "buy": 26.892,
    "sell": 27.0265,
    "date": "2026-10-06",
    "source": "ficohsa"
  },
  "diesel": {
    "sps": 149.29,
    "tegus": 153.53,
    "date": "2026-10-06",
    "source": "laprensa",
    "parser": "sps-marker-galon+vigentes-a-partir"
  },
  "override": null
};

export const dollarMetrics: InfoMetric[] = [
  {
    label: 'Compra',
    value: 'L 26.8920',
    helper: 'Referencia de compra',
  },
  {
    label: 'Venta',
    value: 'L 27.0265',
    helper: 'Referencia de venta',
  },
];

export const dieselMetrics: InfoMetric[] = [
  {
    label: 'San Pedro Sula',
    value: 'L 149.29',
    helper: 'Por galón',
  },
  {
    label: 'Tegucigalpa',
    value: 'L 153.53',
    helper: 'Por galón',
  },
];
