import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  "dollar": {
    "buy": 26.8927,
    "sell": 27.0272,
    "date": "2026-10-14",
    "source": "ficohsa"
  },
  "diesel": {
    "sps": 149.29,
    "tegus": 153.53,
    "date": "2026-10-10",
    "source": "laprensa",
    "parser": "sps-marker-galon+vigentes-a-partir"
  },
  "override": null
};

export const dollarMetrics: InfoMetric[] = [
  {
    label: 'Compra',
    value: 'L 26.8927',
    helper: 'Referencia de compra',
  },
  {
    label: 'Venta',
    value: 'L 27.0272',
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
