import { describe, expect, it } from 'vitest';
import { INVARIANTS, blockMessage, missingBaseline, validateGroup } from '../validate.mjs';

const NO_PREV_DOLLAR = { buy: null, sell: null };
const NO_PREV_DIESEL = { sps: null, tegus: null };
const dollar = (buy, sell, prev = NO_PREV_DOLLAR, override = null) =>
  validateGroup('dollar', { buy, sell }, prev, override);
const diesel = (sps, tegus, prev = NO_PREV_DIESEL, override = null) =>
  validateGroup('diesel', { sps, tegus }, prev, override);
const blockedIds = (r) => r.blocked.map((b) => b.id);
const byId = (id) => INVARIANTS.find((i) => i.id === id);

describe('Tier A: dollar venta > compra (strict)', () => {
  it('blocks an inversion and names the rule', () => {
    const r = dollar(27.0, 26.9);
    expect(blockedIds(r)).toContain('dollar-venta-gt-compra');
    expect(blockMessage(r.blocked[0], {})).toContain('venta > compra');
  });

  it('blocks equality', () => {
    expect(blockedIds(dollar(27.0, 27.0))).toContain('dollar-venta-gt-compra');
  });

  it('passes venta > compra', () => {
    expect(dollar(26.9, 27.0).blocked).toEqual([]);
  });
});

describe('Tier B: generous ranges (inclusive)', () => {
  it('blocks order-of-magnitude and decimal-point errors', () => {
    expect(blockedIds(dollar(26.9, 270.0))).toContain('dollar-range');
    expect(blockedIds(dollar(2.69, 2.7))).toContain('dollar-range');
    expect(blockedIds(diesel(14.7, 15.2))).toContain('diesel-range');
    expect(blockedIds(diesel(149.2, 1535.3))).toContain('diesel-range');
  });

  it('passes the exact limits 20 / 40 / 50 / 300', () => {
    expect(dollar(20, 40).blocked).toEqual([]);
    expect(diesel(50, 300).blocked).toEqual([]);
  });

  it('rejects non-finite values (what parseNumber used to turn into 0)', () => {
    expect(blockedIds(dollar(0, 0))).toContain('dollar-range');
    expect(blockedIds(dollar(Number.NaN, 27))).toContain('dollar-range');
    expect(blockedIds(diesel(null, 150))).toContain('diesel-range');
  });

  // CORRECTION 2. The range tier catches ONLY order-of-magnitude and decimal-point
  // errors. All four known-bad values lie inside [50, 300], so Tier B alone would
  // have let every real incident through. What catches them is Tier C
  // (tegus > sps rejects the shipped 130.62 / 119.97) and Tier D
  // (|85.14 - 146.85| = 61.71, |238.13 - 151.10| = 87.03). Do not treat the range
  // check as coverage for the incidents.
  it.each([85.14, 238.13, 130.62, 119.97])('Tier B alone does NOT catch the known-bad value %s', (v) => {
    const range = byId('diesel-range');
    expect(range.check({ values: { sps: v, tegus: v }, previous: NO_PREV_DIESEL })).toBeNull();
  });
});

describe('Tier C: diesel tegus > sps (strict), id diesel-tegus-gt-sps', () => {
  it('blocks the shipped inversion 130.62 / 119.97', () => {
    expect(blockedIds(diesel(130.62, 119.97))).toEqual(['diesel-tegus-gt-sps']);
  });

  it('blocks equality (block-slicing collapse resolves both cities to one sentence)', () => {
    expect(blockedIds(diesel(149.2, 149.2))).toEqual(['diesel-tegus-gt-sps']);
  });

  it('passes tegus > sps', () => {
    expect(diesel(149.2, 153.53).blocked).toEqual([]);
  });

  it('message says estrictamente mayor, never mayor o igual, and carries id and both values', () => {
    const r = diesel(130.62, 119.97);
    const msg = blockMessage(r.blocked[0], { today: '2026-10-02', provenance: 'legacy' });
    expect(msg).toContain('diesel-tegus-gt-sps');
    expect(msg).toContain('estrictamente mayor');
    expect(msg).not.toContain('mayor o igual');
    expect(msg).not.toContain('gte');
    expect(msg).toContain('130.62');
    expect(msg).toContain('119.97');
    expect(msg).toContain('-10.65');
    expect(msg).toContain('legacy');
  });

  it('message states blast radius, UI and CLI steps and a ready-to-paste expiry of today + 14', () => {
    const msg = blockMessage(diesel(130.62, 119.97).blocked[0], { today: '2026-10-02', provenance: 'legacy' });
    expect(msg).toContain('El dólar NO se ve afectado');
    expect(msg).toContain('Variables');
    expect(msg).toContain('gh variable set PRECIOS_OVERRIDE --body "diesel-tegus-gt-sps:2026-10-16"');
    expect(msg).toContain('Los días en que el override efectivamente se aplique');
    expect(msg).not.toMatch(/mientras (esté|este) activo/i);
  });

  it('is the only overridable invariant', () => {
    expect(INVARIANTS.filter((i) => i.overridable).map((i) => i.id)).toEqual(['diesel-tegus-gt-sps']);
  });
});

describe('Tier D: absolute delta against the last stored value', () => {
  // Reasoning (do not re-add date coupling): the bounds are ABSOLUTE against the last
  // stored value, with no elapsed-day normalization and no per-metric dates. 0.25
  // absorbs about 18 consecutive maximum-move days (largest observed daily dollar move
  // is 0.0138); 15 absorbs about 6 weeks of normal weekly diesel movement (~2.35-2.43
  // per week). A longer gap means the bot was down for weeks and a red job is the
  // correct outcome anyway.
  it('blocks the 15/09 incident values', () => {
    const prev = { sps: 146.85, tegus: 151.1 };
    expect(blockedIds(diesel(85.14, 238.13, prev))).toContain('diesel-delta');
    expect(blockedIds(diesel(85.14, 151.1, prev))).toContain('diesel-delta');
    expect(blockedIds(diesel(146.85, 238.13, prev))).toContain('diesel-delta');
  });

  it('passes a normal weekly move', () => {
    expect(diesel(149.28, 153.53, { sps: 146.85, tegus: 151.1 }).blocked).toEqual([]);
  });

  it('the limit itself passes: 15 diesel, 0.25 dollar; just over blocks', () => {
    expect(diesel(161.85, 166.1, { sps: 146.85, tegus: 151.1 }).blocked).toEqual([]);
    expect(blockedIds(diesel(161.86, 166.1, { sps: 146.85, tegus: 151.1 }))).toContain('diesel-delta');
    expect(dollar(26.75, 27.0, { buy: 26.5, sell: 26.75 }).blocked).toEqual([]);
    expect(blockedIds(dollar(26.76, 27.0, { buy: 26.5, sell: 26.75 }))).toContain('dollar-delta');
  });

  it('is skipped for a value with no previous, and reports which are missing', () => {
    expect(blockedIds(diesel(85.14, 238.13))).not.toContain('diesel-delta');
    expect(missingBaseline({ sps: 1, tegus: 2 }, { sps: null, tegus: 2 })).toEqual(['sps']);
  });

  it('still applies to the value that has a previous when the other is missing', () => {
    expect(blockedIds(diesel(85.14, 153.53, { sps: 146.85, tegus: null }))).toContain('diesel-delta');
  });
});

describe('group independence', () => {
  it('a violation in one group does not touch the other', () => {
    expect(dollar(27.0, 26.9).blocked.length).toBeGreaterThan(0);
    expect(diesel(149.2, 153.53).blocked).toEqual([]);
    expect(diesel(130.62, 119.97).blocked.length).toBeGreaterThan(0);
    expect(dollar(26.9, 27.0).blocked).toEqual([]);
  });
});
