import { getMultiCurrencyConfig } from "./multiCurrency";

export function formatDualCurrency(amount, primarySymbol) {
  const num = Number(amount) || 0;
  const fixed = num.toFixed(2);
  const symbol = primarySymbol || "$";
  const primary = symbol + fixed;
  const config = getMultiCurrencyConfig();

  if (!config.enabled || !config.exchangeRate || config.exchangeRate <= 0) {
    return primary;
  }

  const secondaryAmount = (num * config.exchangeRate).toFixed(2);
  const secondarySymbol = config.secondarySymbol || "Bs.";
  return (
    primary +
    " (" +
    secondarySymbol +
    secondaryAmount +
    " " +
    config.secondaryCode +
    ")"
  );
}
