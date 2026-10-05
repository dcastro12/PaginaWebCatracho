import { describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildFile, parsePrevious, readPrevious } from '../dataset.mjs';

// Golden output: this string is what the scraper writes to
// src/content/datasets/information.ts. Any change here is a dataset shape change.
const GOLDEN = `import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  "dollar": {
    "buy": 26.8989,
    "sell": 27.0334,
    "date": "2026-10-01",
    "source": "ficohsa"
  },
  "diesel": {
    "sps": 149.2,
    "tegus": 153.53,
    "date": "2026-09-28",
    "source": "laprensa",
    "parser": "tegus-marker-galon+entra-en-vigencia"
  },
  "override": null
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

// Each group carries the ISO date of its own last successful scrape + validation.
const INPUT = {
  dollar: { buy: 26.8989, sell: 27.0334, date: '2026-10-01' },
  diesel: { sps: 149.2, tegus: 153.53, date: '2026-09-28', parser: 'tegus-marker-galon+entra-en-vigencia' },
};

describe('buildFile', () => {
  it('renders the exact dataset module', () => {
    expect(buildFile(INPUT)).toBe(GOLDEN);
  });
});

const EMPTY = {
  dollar: { buy: null, sell: null, date: null },
  diesel: { sps: null, tegus: null, date: null, parser: null },
  override: null,
  legacy: false,
};

// Verbatim shape of the file before this change: the snapshot is not JSON.
const LEGACY = `import type { InfoMetric } from '../../types/content';

export const informationSnapshot = {
  updatedAt: '02/10/2026',
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
`;

describe('snapshot as JSON', () => {
  it('is valid JSON once the TypeScript wrapper is removed', () => {
    const out = buildFile(INPUT);
    const literal = /export const informationSnapshot = (\{[\s\S]*?\n\});/.exec(out)[1];
    expect(JSON.parse(literal).dollar).toEqual({ buy: 26.8989, sell: 27.0334, date: '2026-10-01', source: 'ficohsa' });
    expect(literal).not.toMatch(/,\s*[}\]]/);
  });

  it('round-trips values and the override record', () => {
    const out = buildFile({ ...INPUT, override: 'diesel-tegus-gt-sps:2026-10-16' });
    expect(parsePrevious(out)).toEqual({
      dollar: INPUT.dollar,
      diesel: INPUT.diesel,
      override: 'diesel-tegus-gt-sps:2026-10-16',
      legacy: false,
    });
  });

  // Churn: buildFile output feeds the prev === next guard. Identical inputs must give
  // identical bytes, and the snapshot may only hold values, a date and `id:expiry`
  // (no timestamps, run ids or counters), or the bot would commit every day.
  it('is deterministic and holds only low-cardinality fields and no shared date', () => {
    expect(buildFile(INPUT)).toBe(buildFile({ ...INPUT }));
    const literal = /export const informationSnapshot = (\{[\s\S]*?\n\});/.exec(buildFile(INPUT))[1];
    expect(Object.keys(JSON.parse(literal))).toEqual(['dollar', 'diesel', 'override']);
  });
});

// Provenance (design 4). The parser id is persisted so format drift is a dated,
// git-blame-able fact. It must be LOW-CARDINALITY: strategy ids and source ids only.
// Anything that varies per run (timestamp, run id, counter) would turn the
// prev === next guard off and commit every day.
describe('parser provenance', () => {
  const snapshot = (input) =>
    JSON.parse(/export const informationSnapshot = (\{[\s\S]*?\n\});/.exec(buildFile(input))[1]);

  it('persists the parser id and the source ids in the snapshot', () => {
    const snap = snapshot(INPUT);
    expect(snap.diesel).toMatchObject({ source: 'laprensa', parser: 'tegus-marker-galon+entra-en-vigencia' });
    expect(snap.dollar).toMatchObject({ source: 'ficohsa' });
  });

  it('round-trips the parser id, and a missing one reads back as null', () => {
    expect(parsePrevious(buildFile(INPUT)).diesel.parser).toBe('tegus-marker-galon+entra-en-vigencia');
    const without = { ...INPUT, diesel: { sps: 149.2, tegus: 153.53, date: '2026-09-28' } };
    expect(snapshot(without).diesel.parser).toBeNull();
    expect(parsePrevious(buildFile(without)).diesel.parser).toBeNull();
  });

  it('never reads anything but an id back as a parser', () => {
    const read = (parser) =>
      parsePrevious(
        `export const informationSnapshot = {\n  "diesel": {"sps": 1, "tegus": 2, "parser": ${JSON.stringify(parser)}}\n};`,
      ).diesel.parser;
    expect(read('two-markers-galon+semana-que-inicia')).toBe('two-markers-galon+semana-que-inicia');
    for (const bad of [42, '', 'has space', '2026-10-05T12:00:00Z', null, {}]) expect(read(bad)).toBeNull();
  });

  // No-churn: byte-identical for identical inputs, and the only per-run-varying fields
  // are the two dates that slice 4 already made intentional. Provenance adds none.
  it('adds no per-run-varying field: same inputs give the same bytes, and provenance is ids only', () => {
    expect(buildFile(INPUT)).toBe(buildFile({ ...INPUT }));
    const snap = snapshot(INPUT);
    expect(Object.keys(snap.dollar)).toEqual(['buy', 'sell', 'date', 'source']);
    expect(Object.keys(snap.diesel)).toEqual(['sps', 'tegus', 'date', 'source', 'parser']);
    for (const id of [snap.dollar.source, snap.diesel.source, snap.diesel.parser]) {
      expect(id).toMatch(/^[a-z0-9+-]+$/);
    }
    // Two days later, same article: only the dates differ.
    const later = { dollar: { ...INPUT.dollar, date: '2026-10-03' }, diesel: { ...INPUT.diesel, date: '2026-10-03' } };
    const strip = (o) => JSON.stringify(o, (k, v) => (k === 'date' ? undefined : v));
    expect(strip(snapshot(later))).toBe(strip(snapshot(INPUT)));
  });
});

describe('per-group dates', () => {
  it('round-trips values AND per-group dates exactly as written (R-F4)', () => {
    const input = {
      dollar: { buy: 26.8925, sell: 27.027, date: '2026-10-02' },
      diesel: { sps: 149.2, tegus: 153.53, date: '2026-09-28', parser: 'tegus-marker-galon+entra-en-vigencia' },
    };
    const read = parsePrevious(buildFile(input));
    expect(read.dollar).toEqual(input.dollar);
    expect(read.diesel).toEqual(input.diesel);
    expect(read.dollar.date).not.toBe(read.diesel.date);
  });

  it.each([
    ['dd/mm/yyyy (not valid for <time datetime>)', '02/10/2026'],
    ['not a calendar date', '2026-13-45'],
    ['a number', 20261002],
    ['empty', ''],
  ])('treats %s as an unknown date, never as a value', (_label, bad) => {
    const content = `export const informationSnapshot = {
  "dollar": {"buy": 26.9, "sell": 27, "date": ${JSON.stringify(bad)}},
  "diesel": {"sps": 1, "tegus": 2}
};`;
    expect(parsePrevious(content).dollar).toEqual({ buy: 26.9, sell: 27, date: null });
  });
});

describe('parsePrevious is total', () => {
  it.each([
    ['empty', ''],
    ['garbage', 'not a module {{{'],
    ['snapshot literal that is not JSON', 'export const informationSnapshot = {\n  nope: 1,\n};'],
    ['snapshot that is not an object', 'export const informationSnapshot = {\n  "dollar": 5\n};'],
  ])('returns an empty snapshot for %s', (_label, content) => {
    expect(parsePrevious(content)).toEqual(EMPTY);
  });

  it('reads each field independently', () => {
    const content =
      'export const informationSnapshot = {\n  "dollar": {"buy": 26.9, "sell": "x"},\n  "diesel": {"sps": 150}\n};';
    expect(parsePrevious(content)).toEqual({
      dollar: { buy: 26.9, sell: null, date: null },
      diesel: { sps: 150, tegus: null, date: null, parser: null },
      override: null,
      legacy: false,
    });
  });

  it('reads a pre-change file via the legacy path and flags it', () => {
    expect(parsePrevious(LEGACY)).toEqual({
      // The legacy shared updatedAt is NOT an observation date for either group
      // (that is incident A), so it is never promoted to a per-group date.
      dollar: { buy: 26.8925, sell: 27.027, date: null },
      diesel: { sps: 149.2, tegus: 153.53, date: null, parser: null },
      override: null,
      legacy: true,
    });
  });

  it('legacy fields are independently null on a miss', () => {
    const partial = LEGACY.replace("label: 'Venta'", "label: 'Otro'");
    expect(parsePrevious(partial).dollar).toEqual({ buy: 26.8925, sell: null, date: null });
  });
});

describe('readPrevious never throws', () => {
  it('returns an empty snapshot for a missing file', async () => {
    expect(await readPrevious(path.join(os.tmpdir(), 'precios-does-not-exist', 'x.ts'))).toEqual(EMPTY);
  });

  it('returns an empty snapshot for a garbage file', async () => {
    const dir = mkdtempSync(path.join(os.tmpdir(), 'precios-ds-'));
    try {
      const file = path.join(dir, 'information.ts');
      writeFileSync(file, 'garbage');
      expect(await readPrevious(file)).toEqual(EMPTY);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
