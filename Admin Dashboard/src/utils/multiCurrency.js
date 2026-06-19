export const MULTICURRENCY_STORAGE_KEY = "enatega-multicurrency";

export const defaultMultiCurrencyConfig = {
  enabled: true,
  autoBcv: true,
  primaryCode: "USD",
  primarySymbol: "$",
  secondaryCode: "VES",
  secondarySymbol: "Bs.",
  exchangeRate: 36.5,
  rateSource: "bcv",
  rateDate: null,
  rateFetchedAt: null,
};

export function getMultiCurrencyConfig() {
  try {
    const raw = localStorage.getItem(MULTICURRENCY_STORAGE_KEY);
    if (raw) {
      return Object.assign({}, defaultMultiCurrencyConfig, JSON.parse(raw));
    }
  } catch (e) {
    console.error(e);
  }
  return Object.assign({}, defaultMultiCurrencyConfig);
}

export function saveMultiCurrencyConfig(config) {
  localStorage.setItem(MULTICURRENCY_STORAGE_KEY, JSON.stringify(config));
}
