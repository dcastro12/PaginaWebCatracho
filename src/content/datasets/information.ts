import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  "dollar": {
    "buy": 26.8883,
    "sell": 27.0227,
    "date": "2026-10-08",
    "source": "ficohsa"
  },
  "diesel": {
    "sps": 149.29,
    "tegus": 153.53,
    "date": "2026-10-08",
    "source": "laprensa",
    "parser": "sps-marker-galon+vigentes-a-partir"
  },
  "override": null
};

export const dollarMetrics: InfoMetric[] = [
  {
    label: 'Compra',
    value: 'L 26.8883',
    helper: 'Referencia de compra',
  },
  {
    label: 'Venta',
    value: 'L 27.0227',
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
