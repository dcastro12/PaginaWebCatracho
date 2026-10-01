export function parseNumber(raw) {
  const cleaned = raw.replace(/[^\d.,-]/g, '').replace(/,/g, '');
  const n = Number(cleaned);
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
