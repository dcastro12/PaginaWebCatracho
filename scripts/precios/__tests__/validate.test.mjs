import { describe, expect, it, vi } from 'vitest';
import {
  INVARIANTS,
  blockMessage,
  invalidOverrideMessage,
  missingBaseline,
  resolveOverride,
  validateGroup,
} from '../validate.mjs';

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
    expect(msg).toContain('El bloqueo afecta solo al diésel; el dólar se evalúa por separado.');
    expect(msg).not.toContain('sí se publicó');
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

describe('resolveOverride (pure, the only reader of PRECIOS_OVERRIDE)', () => {
  const TODAY = '2026-10-02';
  const ID = 'diesel-tegus-gt-sps';

  it('treats unset or blank as no override', () => {
    expect(resolveOverride(undefined, TODAY)).toBeNull();
    expect(resolveOverride('', TODAY)).toBeNull();
    expect(resolveOverride('   ', TODAY)).toBeNull();
  });

  it('accepts id:expiry up to today + 14 days, inclusive', () => {
    expect(resolveOverride(`${ID}:2026-10-16`, TODAY)).toEqual({ ok: true, id: ID, expires: '2026-10-16' });
    expect(resolveOverride(`${ID}:2026-10-02`, TODAY)).toEqual({ ok: true, id: ID, expires: '2026-10-02' });
  });

  it('trims outer whitespace of the whole value but stays strict', () => {
    expect(resolveOverride(`  ${ID}:2026-10-16 `, TODAY)).toEqual({ ok: true, id: ID, expires: '2026-10-16' });
    expect(resolveOverride(`${ID}:2026-10-16	`, TODAY).ok).toBe(true);
    expect(resolveOverride(`${ID}:2026-10-16 extra`, TODAY).ok).toBe(false);
    expect(resolveOverride(`${ID} :2026-10-16`, TODAY).ok).toBe(false);
  });

  it.each([
    ['expiry beyond the 14 day cap', `${ID}:2026-10-17`],
    ['expiry in the past', `${ID}:2026-10-01`],
    ['unknown id', 'dollar-range:2026-10-10'],
    ['not a real date', `${ID}:2026-02-31`],
    ['missing expiry', ID],
    ['trailing garbage', `${ID}:2026-10-10 extra`],
    ['boolean-looking true', 'true'],
    ['boolean-looking 1', '1'],
    ['wildcard *', '*'],
    ['all', 'all'],
    ['wildcard id', '*:2026-10-10'],
  ])('fails closed: %s', (_label, raw) => {
    const r = resolveOverride(raw, TODAY);
    expect(r.ok).toBe(false);
    expect(r.raw).toBe(raw);
    expect(typeof r.reason).toBe('string');
  });

  it('prints a distinct message naming what was rejected and the overridable ids', () => {
    const msg = invalidOverrideMessage(resolveOverride('true', TODAY));
    expect(msg).toContain('PRECIOS_OVERRIDE presente pero NO aplicado');
    expect(msg).toContain('Valor recibido: "true"');
    expect(msg).toContain('Invariantes que admiten override: diesel-tegus-gt-sps');
  });
});

describe('override scope is structural', () => {
  const OVERRIDE = { ok: true, id: 'diesel-tegus-gt-sps', expires: '2026-10-16' };

  it('bypasses Tier C and reports it as applied', () => {
    const r = validateGroup('diesel', { sps: 130.62, tegus: 119.97 }, NO_PREV_DIESEL, OVERRIDE);
    expect(r.blocked).toEqual([]);
    expect(r.overridden.map((o) => o.id)).toEqual(['diesel-tegus-gt-sps']);
  });

  it('does not bypass Tier B or D even when C is overridden', () => {
    const range = validateGroup('diesel', { sps: 14.7, tegus: 13.0 }, NO_PREV_DIESEL, OVERRIDE);
    expect(range.blocked.map((b) => b.id)).toEqual(['diesel-range']);
    const delta = validateGroup('diesel', { sps: 130.62, tegus: 119.97 }, { sps: 146.85, tegus: 151.1 }, OVERRIDE);
    expect(delta.blocked.map((b) => b.id)).toEqual(['diesel-delta']);
    expect(delta.overridden.map((o) => o.id)).toEqual(['diesel-tegus-gt-sps']);
  });

  it('an override naming another invariant overrides nothing', () => {
    const r = validateGroup('diesel', { sps: 130.62, tegus: 119.97 }, NO_PREV_DIESEL, { ok: true, id: 'diesel-range', expires: '2026-10-16' });
    expect(r.blocked.map((b) => b.id)).toEqual(['diesel-tegus-gt-sps']);
    expect(r.overridden).toEqual([]);
  });

  it('an invalid override result overrides nothing', () => {
    const r = validateGroup('diesel', { sps: 130.62, tegus: 119.97 }, NO_PREV_DIESEL, resolveOverride('true', '2026-10-02'));
    expect(r.blocked.map((b) => b.id)).toEqual(['diesel-tegus-gt-sps']);
  });

  it('check functions are never called with an override argument', () => {
    const spies = INVARIANTS.map((inv) => vi.spyOn(inv, 'check'));
    validateGroup('dollar', { buy: 27, sell: 26 }, NO_PREV_DOLLAR, OVERRIDE);
    validateGroup('diesel', { sps: 130.62, tegus: 119.97 }, NO_PREV_DIESEL, OVERRIDE);
    for (const spy of spies) for (const call of spy.mock.calls) expect(call).toHaveLength(1);
    expect(spies.some((s) => s.mock.calls.length > 0)).toBe(true);
    vi.restoreAllMocks();
  });
});
