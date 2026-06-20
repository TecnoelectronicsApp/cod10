const CASH_METHOD_IDS = new Set(['efectivo', 'cash', 'cod']);

export function isCashPayment(methodId?: string | null): boolean {
  if (!methodId) return false;
  return CASH_METHOD_IDS.has(methodId.toLowerCase());
}

export const COMMON_CASH_BILLS = [1, 5, 10, 20, 50, 100] as const;

export function calcCashChange(tender: number, total: number): number {
  if (!Number.isFinite(tender) || !Number.isFinite(total)) return 0;
  return Math.max(0, Math.round((tender - total) * 100) / 100);
}

export function formatCashTenderLine(tender: number, total: number, symbol = '$'): string {
  const change = calcCashChange(tender, total);
  return `Billete: ${symbol}${tender.toFixed(2)} | Vuelto: ${symbol}${change.toFixed(2)}`;
}

export function parseCashTenderFromDetails(details?: string): number | null {
  if (!details) return null;
  const match = details.match(/Billete:\s*\$?\s*([\d.,]+)/i);
  if (!match) return null;
  const n = parseFloat(match[1].replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
