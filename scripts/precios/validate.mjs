// Validation of scraped values before publishing. Pure: values in, verdict out.
//
// A group fails AS A UNIT (DOLLAR = {buy, sell}; DIESEL = {sps, tegus}) and a
// violation in one group never blocks the other.
//
// Invariants are data: { id, group, tier, overridable, check }. `check` receives
// ONLY { values, previous } and returns null or a violation. It never receives an
// override: a non-overridable check has no parameter to consult and cannot be bypassed.

export const OVERRIDE_MAX_DAYS = 14;

const num = (v) => typeof v === 'number' && Number.isFinite(v);
const fmt = (n) => (num(n) ? n.toFixed(2) : String(n));
const inRange = (v, min, max) => num(v) && v >= min && v <= max;

export function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function rangeCheck(keys, min, max, names) {
  return ({ values }) => {
    const bad = keys.filter((k) => !inRange(values[k], min, max));
    if (bad.length === 0) return null;
    return {
      rule: `${bad.map((k) => names[k]).join(' y ')} debe estar entre ${min} y ${max} (inclusive)`,
      observed: bad.map((k) => `${names[k]} ${values[k]}`).join(', '),
    };
  };
}

// Tier D. ABSOLUTE difference against the last stored value, with NO elapsed-day
// normalization and NO dependency on per-metric dates. 0.25 absorbs about 18
// consecutive maximum-move days (largest observed daily dollar move is 0.0138); 15
// absorbs about 6 weeks of normal weekly diesel movement (~2.35-2.43 per week). A gap
// longer than that means the bot was down for weeks and a red job is the correct
// outcome anyway. Do not re-add date coupling: it would make this slice depend on
// per-metric freshness (slice 4) for no gain. A value with no previous is skipped.
function deltaCheck(keys, limit, names) {
  return ({ values, previous }) => {
    const bad = keys.filter((k) => num(previous[k]) && num(values[k]) && Math.abs(values[k] - previous[k]) > limit);
    if (bad.length === 0) return null;
    return {
      rule: `${bad.map((k) => names[k]).join(' y ')} no puede moverse más de ${limit} respecto del último valor publicado`,
      observed: bad
        .map((k) => `${names[k]} ${fmt(previous[k])} -> ${fmt(values[k])} (diferencia ${fmt(values[k] - previous[k])})`)
        .join(', '),
    };
  };
}

const DOLLAR_NAMES = { buy: 'compra', sell: 'venta' };
const DIESEL_NAMES = { sps: 'San Pedro Sula', tegus: 'Tegucigalpa' };

export const INVARIANTS = [
  {
    id: 'dollar-venta-gt-compra',
    group: 'dollar',
    tier: 'A',
    overridable: false,
    check: ({ values }) =>
      num(values.buy) && num(values.sell) && values.sell > values.buy
        ? null
        : {
            rule: 'venta > compra (estrictamente mayor)',
            observed: `compra ${values.buy}, venta ${values.sell}`,
          },
  },
  {
    id: 'dollar-range',
    group: 'dollar',
    tier: 'B',
    overridable: false,
    check: rangeCheck(['buy', 'sell'], 20, 40, DOLLAR_NAMES),
  },
  {
    id: 'diesel-range',
    group: 'diesel',
    tier: 'B',
    overridable: false,
    check: rangeCheck(['sps', 'tegus'], 50, 300, DIESEL_NAMES),
  },
  {
    // Strict `>`: equality is a realistic parser-bug signature (a block-slicing
    // collapse resolves both cities to the same sentence, so sps === tegus).
    id: 'diesel-tegus-gt-sps',
    group: 'diesel',
    tier: 'C',
    overridable: true,
    check: ({ values }) =>
      num(values.sps) && num(values.tegus) && values.tegus > values.sps
        ? null
        : {
            rule: 'el diésel de Tegucigalpa debe ser estrictamente mayor al de San Pedro Sula',
            observed: `Tegucigalpa L ${fmt(values.tegus)} <= San Pedro Sula L ${fmt(values.sps)}   (diferencia ${fmt(values.tegus - values.sps)})`,
          },
  },
  {
    id: 'dollar-delta',
    group: 'dollar',
    tier: 'D',
    overridable: false,
    check: deltaCheck(['buy', 'sell'], 0.25, DOLLAR_NAMES),
  },
  {
    id: 'diesel-delta',
    group: 'diesel',
    tier: 'D',
    overridable: false,
    check: deltaCheck(['sps', 'tegus'], 15, DIESEL_NAMES),
  },
];

/** Keys of `values` with no usable previous value (Tier D is skipped for them). */
export function missingBaseline(values, previous) {
  return Object.keys(values).filter((k) => !num(previous[k]));
}

/**
 * @returns {{blocked: Array<{id: string, tier: string, overridable: boolean, violation: object}>}}
 */
export function validateGroup(group, values, previous) {
  const blocked = [];
  for (const inv of INVARIANTS.filter((i) => i.group === group)) {
    const violation = inv.check({ values, previous });
    if (violation) blocked.push({ id: inv.id, tier: inv.tier, overridable: inv.overridable, violation });
  }
  return { blocked };
}

function tierCMessage({ id, violation }, { today, provenance }) {
  const expiry = addDays(today, OVERRIDE_MAX_DAYS);
  return `BLOQUEO Tier C — invariante "${id}"

  Regla: ${violation.rule}.
  Observado: ${violation.observed}
  Fuente: laprensa / estrategia "${provenance}"

  No se publicó el diésel. El dólar NO se ve afectado y sí se publicó.

  Si la inversión es REAL (cambió la base administrativa y Tegucigalpa
  efectivamente quedó por debajo de San Pedro Sula), publicá así:

    1. GitHub > Settings > Secrets and variables > Actions > Variables
    2. Crear la variable  PRECIOS_OVERRIDE  con valor:

         ${id}:${expiry}

       (formato <id-invariante>:<vencimiento>, máximo ${OVERRIDE_MAX_DAYS} días; esa fecha ya
        es el máximo permitido para hoy)
    3. Actions > "Update precios (dólar + diésel)" > Run workflow

    Por CLI es lo mismo:
       gh variable set PRECIOS_OVERRIDE --body "${id}:${expiry}"

  Los días en que el override efectivamente se aplique, el job quedará en ROJO
  a propósito. El override vence solo el ${expiry} y afecta ÚNICAMENTE esta
  invariante; el resto de las validaciones siguen bloqueando.

  Si la inversión es permanente: corregí la invariante en
  scripts/precios/validate.mjs y borrá la variable PRECIOS_OVERRIDE.`;
}

/** Operator-facing text for one blocked invariant. `ctx`: { today: ISO, provenance }. */
export function blockMessage(block, ctx) {
  if (block.id === 'diesel-tegus-gt-sps') return tierCMessage(block, ctx);
  return `BLOQUEO Tier ${block.tier} — invariante "${block.id}"

  Regla: ${block.violation.rule}.
  Observado: ${block.violation.observed}

  El grupo no se publicó; se conserva el valor anterior.`;
}
