/** Türkçe sayı gösterimi: 100000 → 100.000 */
export function formatDecimalTr(
  value: number | string,
  maxFractionDigits = 0,
): string {
  const num = typeof value === "string" ? parseDecimalTr(value) : value;
  if (typeof value === "string" && value.trim() === "") return "";
  if (!Number.isFinite(num)) return "";

  return new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(num);
}

/** 100.000 veya 100000 → 100000 */
export function parseDecimalTr(value: string): number {
  const trimmed = value.trim();
  if (!trimmed) return 0;

  const normalized = trimmed
    .replace(/\s/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}
