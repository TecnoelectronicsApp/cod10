import { bcv_api_url } from "../config/config";
import {
  getMultiCurrencyConfig,
  saveMultiCurrencyConfig,
} from "./multiCurrency";

const RATE_CACHE_TTL_MS = 60 * 60 * 1000;

function getApiBase() {
  return (bcv_api_url || "http://localhost:8000").replace(/\/$/, "");
}

export async function fetchBcvUsdRate() {
  const base = getApiBase();
  const simpleRes = await fetch(base + "/usd/simple");

  if (!simpleRes.ok) {
    throw new Error("BCV API respondió con error " + simpleRes.status);
  }

  const simpleData = await simpleRes.json();
  const rate = Number(simpleData.valor);

  if (!rate || rate <= 0 || isNaN(rate)) {
    throw new Error("Tasa BCV inválida");
  }

  let rateDate = null;

  try {
    const fullRes = await fetch(base + "/usd");
    if (fullRes.ok) {
      const fullData = await fullRes.json();
      if (fullData.fecha) {
        rateDate = fullData.fecha;
      }
    }
  } catch (e) {
    console.warn("No se pudo obtener fecha BCV", e);
  }

  return {
    rate: rate,
    rateDate: rateDate,
    fetchedAt: new Date().toISOString(),
  };
}

export async function refreshBcvExchangeRate() {
  const bcv = await fetchBcvUsdRate();
  const config = getMultiCurrencyConfig();

  saveMultiCurrencyConfig(
    Object.assign({}, config, {
      exchangeRate: bcv.rate,
      autoBcv: true,
      rateSource: "bcv",
      rateDate: bcv.rateDate,
      rateFetchedAt: bcv.fetchedAt,
    })
  );

  return bcv;
}

export async function ensureBcvRateFresh() {
  const config = getMultiCurrencyConfig();

  if (config.autoBcv === false) {
    return config;
  }

  const fetchedAt = config.rateFetchedAt
    ? new Date(config.rateFetchedAt).getTime()
    : 0;
  const isFresh =
    fetchedAt > 0 &&
    Date.now() - fetchedAt < RATE_CACHE_TTL_MS &&
    config.exchangeRate > 0;

  if (isFresh) {
    return config;
  }

  try {
    await refreshBcvExchangeRate();
  } catch (e) {
    console.warn("BCV rate fetch failed:", e.message);
  }

  return getMultiCurrencyConfig();
}

export function isBcvRateStale() {
  const config = getMultiCurrencyConfig();
  if (!config.rateFetchedAt) {
    return true;
  }
  return (
    Date.now() - new Date(config.rateFetchedAt).getTime() >= RATE_CACHE_TTL_MS
  );
}
