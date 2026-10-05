export function parseNumber(raw) {
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  // Number('') is 0, so text with no digits ('n/a') must be rejected explicitly.
  const n = cleaned === '' ? Number.NaN : Number(cleaned);
  if (!Number.isFinite(n)) throw new Error(`Valor no numérico: "${raw}"`);
  return n;
}

export function formatLempira(n, decimals) {
  return `L ${n.toFixed(decimals)}`;
}

export function today() {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yy = d.getFullYear();
  return `${dd}/${mm}/${yy}`;
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

// Whole calendar days from `fromISO` to `toISO` (negative when `toISO` is earlier).
// Built from the date parts in UTC, so the host timezone cannot shift a day. NaN for
// anything that is not an ISO date; callers decide what that means.
export function daysBetween(fromISO, toISO) {
  const utc = (iso) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso));
    return m ? Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : Number.NaN;
  };
  return Math.round((utc(toISO) - utc(fromISO)) / 86_400_000);
}
