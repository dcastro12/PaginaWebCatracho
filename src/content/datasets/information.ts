import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  "dollar": {
    "buy": 26.9235,
    "sell": 27.0581,
    "date": "2026-11-27",
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
    value: 'L 26.9235',
    helper: 'Referencia de compra',
  },
  {
    label: 'Venta',
    value: 'L 27.0581',
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
