const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 });
const compactUsd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  notation: "compact",
  maximumFractionDigits: 2,
});
const compact = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 });

export const DASH = "—";

const isNum = (n: number | null | undefined): n is number => typeof n === "number" && Number.isFinite(n);

export function formatUsd(n: number | null | undefined) {
  return isNum(n) ? usd.format(n) : DASH;
}

export function formatCompactUsd(n: number | null | undefined) {
  return isNum(n) ? compactUsd.format(n) : DASH;
}

export function formatCompact(n: number | null | undefined) {
  return isNum(n) ? compact.format(n) : DASH;
}

/** Prices keep ~4 significant digits; tiny memecoin prices use subscript-free zero compression. */
export function formatPrice(n: number | null | undefined) {
  if (!isNum(n)) return DASH;
  if (n === 0) return "$0";
  const abs = Math.abs(n);
  if (abs >= 1) return usd.format(n);
  if (abs >= 0.0001) return `$${n.toPrecision(4).replace(/0+$/, "")}`;
  // Subscript-style notation: $0.0{4}231 = $0.0000231 (four zeros after the decimal point).
  // toExponential rounds first, so 0.000099999 becomes 1.000e-4 rather than keeping an extra zero.
  const [mantissa, exponent] = abs.toExponential(3).split("e");
  const zeros = -Number(exponent) - 1;
  const digits = mantissa.replace(".", "").replace(/0+$/, "");
  return `${n < 0 ? "-" : ""}$0.0{${zeros}}${digits}`;
}

export function formatPct(n: number | null | undefined, { signed = true } = {}) {
  if (!isNum(n)) return DASH;
  const sign = signed && n > 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

export function formatAmount(n: number | null | undefined) {
  if (!isNum(n)) return DASH;
  if (Math.abs(n) >= 1000) return compact.format(n);
  return n.toLocaleString("en-US", { maximumSignificantDigits: 5 });
}

export function shortAddress(address: string, chars = 4) {
  return address.length <= chars * 2 + 1 ? address : `${address.slice(0, chars)}…${address.slice(-chars)}`;
}

export function timeAgo(unixSeconds: number, now = Date.now()) {
  const s = Math.max(0, Math.floor(now / 1000 - unixSeconds));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86_400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86_400)}d`;
}

export function utcTimestamp(unixSeconds: number) {
  return `${new Date(unixSeconds * 1000).toISOString().replace("T", " ").slice(0, 19)} UTC`;
}

export const changeTone = (n: number | null | undefined) =>
  !isNum(n) || n === 0 ? "text-muted-foreground" : n > 0 ? "text-positive" : "text-negative";
