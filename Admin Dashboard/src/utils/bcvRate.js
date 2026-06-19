import { getBcvApiBase } from "../config/config";
import {
  getMultiCurrencyConfig,
  saveMultiCurrencyConfig,
  defaultMultiCurrencyConfig,
} from "./multiCurrency";
import { fetchBcvRatePublic } from "./bcvPublic";
import {
  buildFullStoreConfig,
  uploadStoreConfigToCloudinary,
} from "./paymentMethods";

const RATE_CACHE_TTL_MS = 60 * 60 * 1000;

async function fetchFromConfiguredApi() {
  const base = getBcvApiBase();
  if (!base) return null;

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
      if (fullData.fecha) rateDate = fullData.fecha;
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

export async function fetchBcvUsdRate() {
  const config = getMultiCurrencyConfig();
  const lastValid =
    config.exchangeRate > 0
      ? config.exchangeRate
      : defaultMultiCurrencyConfig.exchangeRate;

  try {
    const configured = await fetchFromConfiguredApi();
    if (configured) return configured;
  } catch (e) {
    console.warn("BCV API local falló:", e.message);
  }

  try {
    return await fetchBcvRatePublic();
  } catch (e) {
    console.warn("BCV API pública falló:", e.message);
  }

  if (lastValid > 0) {
    return {
      rate: lastValid,
      rateDate: config.rateDate || null,
      fetchedAt: config.rateFetchedAt || new Date().toISOString(),
    };
  }

  throw new Error("No hay tasa BCV disponible");
}

export async function refreshBcvExchangeRate() {
  const bcv = await fetchBcvUsdRate();
  const config = getMultiCurrencyConfig();

  const next = Object.assign({}, config, {
    exchangeRate: bcv.rate,
    autoBcv: true,
    rateSource: "bcv",
    rateDate: bcv.rateDate,
    rateFetchedAt: bcv.fetchedAt,
  });

  saveMultiCurrencyConfig(next);

  try {
    await uploadStoreConfigToCloudinary(
      buildFullStoreConfig(null, {
        exchangeRate: bcv.rate,
        rateDate: bcv.rateDate,
        rateFetchedAt: bcv.fetchedAt,
        enabled: next.enabled,
        secondarySymbol: next.secondarySymbol,
      })
    );
  } catch (e) {
    console.warn("No se pudo publicar tasa en Cloudinary:", e.message);
  }

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
    console.warn(
      "BCV rate fetch failed, usando última tasa válida:",
      e.message
    );
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
