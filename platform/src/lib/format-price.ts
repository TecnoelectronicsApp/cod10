export function formatDualPrice(
  amount: number,
  primarySymbol = '$',
  exchangeRate: number | null | undefined
): string {
  const num = Number(amount) || 0;
  const primary = `${primarySymbol}${num.toFixed(2)}`;
  if (!exchangeRate || exchangeRate <= 0) return primary;
  const bs = (num * exchangeRate).toFixed(2);
  return `${primary} / Bs.${bs}`;
}

export function formatDualPriceParts(
  amount: number,
  primarySymbol = '$',
  exchangeRate: number | null | undefined
): { primary: string; secondary: string | null } {
  const num = Number(amount) || 0;
  const primary = `${primarySymbol}${num.toFixed(2)}`;
  if (!exchangeRate || exchangeRate <= 0) {
    return { primary, secondary: null };
  }
  return {
    primary,
    secondary: `Bs.${(num * exchangeRate).toFixed(2)}`,
  };
}

/** Formato admin: $14.00 (Bs.8503.49 VES) */
export function formatDualPriceAdmin(
  amount: number,
  primarySymbol = '$',
  exchangeRate: number | null | undefined,
  secondaryCode = 'VES'
): string {
  const num = Number(amount) || 0;
  const primary = `${primarySymbol}${num.toFixed(2)}`;
  if (!exchangeRate || exchangeRate <= 0) return primary;
  const bs = (num * exchangeRate).toFixed(2);
  return `${primary} (Bs.${bs} ${secondaryCode})`;
}
