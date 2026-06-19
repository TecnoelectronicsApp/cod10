import { cloudinary_upload_url, getBcvApiBase } from "../config/config";
import {
  getMultiCurrencyConfig,
  defaultMultiCurrencyConfig,
} from "./multiCurrency";

export const PAYMENT_METHODS_STORAGE_KEY = "cod10-payment-methods";

export const STORE_CONFIG_CLOUDINARY_URL =
  process.env.REACT_APP_STORE_CONFIG_URL ||
  "https://res.cloudinary.com/dimjm4ald/raw/upload/food/cod10/store-config-v3.json";

export const KNOWN_PAYMENT_METHOD_IDS = [
  "efectivo",
  "punto_venta",
  "pagomovil",
  "binance",
];

export const VENEZUELAN_BANKS = [
  { code: "0102", name: "Banco de Venezuela" },
  { code: "0104", name: "Venezolano de Crédito" },
  { code: "0105", name: "Mercantil" },
  { code: "0108", name: "Provincial" },
  { code: "0114", name: "Bancaribe" },
  { code: "0115", name: "Exterior" },
  { code: "0116", name: "BOD" },
  { code: "0134", name: "Banesco" },
  { code: "0137", name: "Sofitasa" },
  { code: "0138", name: "Banco Plaza" },
  { code: "0151", name: "BFC" },
  { code: "0156", name: "100% Banco" },
  { code: "0157", name: "DelSur" },
  { code: "0163", name: "Banco del Tesoro" },
  { code: "0166", name: "Agrícola de Venezuela" },
  { code: "0168", name: "Bancrecer" },
  { code: "0169", name: "Mi Banco" },
  { code: "0171", name: "Activo" },
  { code: "0172", name: "Bancamiga" },
  { code: "0174", name: "Banplus" },
  { code: "0175", name: "Bicentenario" },
  { code: "0177", name: "Banfanb" },
];

export const defaultPaymentMethodsConfig = {
  paymentMethods: [
    { id: "efectivo", enabled: true, label: "Efectivo" },
    { id: "punto_venta", enabled: true, label: "Punto de venta" },
    {
      id: "pagomovil",
      enabled: true,
      label: "Pagomóvil",
      bankCode: "0102",
      bankName: "Banco de Venezuela",
      phone: "",
      ci: "",
    },
    { id: "binance", enabled: false, label: "Binance", payId: "" },
  ],
};

/** Siempre devuelve los 4 métodos conocidos, fusionando datos guardados */
export function normalizePaymentMethodsConfig(config) {
  const defaults = defaultPaymentMethodsConfig.paymentMethods;
  const incoming = (config && config.paymentMethods) || [];
  const byId = {};

  incoming.forEach(function (method) {
    if (
      method &&
      method.id &&
      KNOWN_PAYMENT_METHOD_IDS.indexOf(method.id) !== -1
    ) {
      byId[method.id] = method;
    }
  });

  return {
    paymentMethods: defaults.map(function (def) {
      const saved = byId[def.id];
      return saved ? Object.assign({}, def, saved) : Object.assign({}, def);
    }),
  };
}

function mergePaymentMethodFields(def, remote, local) {
  const merged = Object.assign({}, def, remote || {}, local || {});
  ["phone", "ci", "payId", "bankCode", "bankName", "label"].forEach(function (
    key
  ) {
    const remoteVal = remote && remote[key];
    const localVal = local && local[key];
    if (typeof remoteVal === "string" && remoteVal.trim()) {
      merged[key] = remoteVal.trim();
    } else if (typeof localVal === "string" && localVal.trim()) {
      merged[key] = localVal.trim();
    }
  });
  if (typeof (remote && remote.enabled) === "boolean") {
    merged.enabled = remote.enabled;
  } else if (typeof (local && local.enabled) === "boolean") {
    merged.enabled = local.enabled;
  }
  return merged;
}

export function buildFullStoreConfig(paymentOverride, multiOverride) {
  const payments = normalizePaymentMethodsConfig(
    paymentOverride || getPaymentMethodsConfig()
  );
  const multi = Object.assign(
    {},
    defaultMultiCurrencyConfig,
    getMultiCurrencyConfig(),
    multiOverride || {}
  );
  const rate = parseFloat(multi.exchangeRate);
  return {
    paymentMethods: payments.paymentMethods,
    multiCurrency: {
      enabled: multi.enabled !== false,
      exchangeRate:
        !isNaN(rate) && rate > 0
          ? rate
          : defaultMultiCurrencyConfig.exchangeRate,
      secondarySymbol: multi.secondarySymbol || "Bs.",
      rateDate: multi.rateDate || null,
      rateFetchedAt: multi.rateFetchedAt || null,
    },
  };
}

export function getPaymentMethodsConfig() {
  try {
    const raw = localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
    if (raw) {
      return normalizePaymentMethodsConfig(JSON.parse(raw));
    }
  } catch (e) {
    console.error(e);
  }
  return normalizePaymentMethodsConfig(defaultPaymentMethodsConfig);
}

export function savePaymentMethodsConfig(config) {
  const normalized = normalizePaymentMethodsConfig(config);
  localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function getCloudinaryRawUploadUrl() {
  const base = cloudinary_upload_url || "";
  if (base.indexOf("/image/upload") !== -1) {
    return base.replace("/image/upload", "/raw/upload");
  }
  return "https://api.cloudinary.com/v1_1/dimjm4ald/raw/upload";
}

export async function fetchStoreConfigFromCloudinary() {
  const url =
    STORE_CONFIG_CLOUDINARY_URL +
    (STORE_CONFIG_CLOUDINARY_URL.indexOf("?") === -1 ? "?" : "&") +
    "t=" +
    Date.now();
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error("No se pudo cargar config desde Cloudinary");
  const data = await res.json();
  if (!data || !data.paymentMethods) {
    throw new Error("Config Cloudinary inválida");
  }
  return data;
}

export async function uploadStoreConfigToCloudinary(config) {
  const full = config.multiCurrency
    ? config
    : buildFullStoreConfig(
        config.paymentMethods
          ? config
          : { paymentMethods: config.paymentMethods }
      );
  const formData = new FormData();
  const blob = new Blob([JSON.stringify(full, null, 2)], {
    type: "application/json",
  });
  formData.append("file", blob, "store-config.json");
  formData.append(
    "upload_preset",
    process.env.REACT_APP_CLOUDINARY_FOOD || "wdgvyas8"
  );
  formData.append("public_id", "cod10/store-config-v3");

  const res = await fetch(getCloudinaryRawUploadUrl(), {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(
      (data && data.error && data.error.message) ||
        "Error al subir configuración a Cloudinary"
    );
  }
  return data;
}

export async function fetchStoreConfigRemote() {
  const base = getBcvApiBase();
  if (!base) throw new Error("API BCV no configurada");
  const res = await fetch(base + "/store-config");
  if (!res.ok) throw new Error("No se pudo cargar la configuración remota");
  return res.json();
}

export async function saveStoreConfigRemote(config) {
  const base = getBcvApiBase();
  if (!base) throw new Error("API BCV no configurada");
  const full = config.multiCurrency
    ? config
    : buildFullStoreConfig(
        config.paymentMethods
          ? config
          : { paymentMethods: config.paymentMethods }
      );
  const res = await fetch(base + "/store-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(full),
  });
  if (!res.ok) throw new Error("No se pudo guardar en la API BCV");
  return res.json();
}

export async function syncPaymentMethodsToServer(config) {
  const normalized = normalizePaymentMethodsConfig(config);
  savePaymentMethodsConfig(normalized);
  const full = buildFullStoreConfig({
    paymentMethods: normalized.paymentMethods,
  });
  let cloudinary = false;
  let remote = false;
  let cloudinaryError = "";
  let remoteError = "";

  try {
    await uploadStoreConfigToCloudinary(full);
    cloudinary = true;
  } catch (e) {
    cloudinaryError = e.message || String(e);
  }

  try {
    await saveStoreConfigRemote(full);
    remote = true;
  } catch (e) {
    remoteError = e.message || String(e);
  }

  return {
    ok: cloudinary || remote,
    cloudinary: cloudinary,
    remote: remote,
    cloudinaryError: cloudinaryError,
    remoteError: remoteError,
  };
}

export async function loadPaymentMethodsConfig() {
  const local = getPaymentMethodsConfig();

  try {
    const cloud = await fetchStoreConfigFromCloudinary();
    const cloudPayments = normalizePaymentMethodsConfig(cloud);
    const merged = normalizePaymentMethodsConfig({
      paymentMethods: cloudPayments.paymentMethods.map(function (remote) {
        const localMethod = local.paymentMethods.find(function (m) {
          return m.id === remote.id;
        });
        const def = defaultPaymentMethodsConfig.paymentMethods.find(function (
          m
        ) {
          return m.id === remote.id;
        });
        if (!localMethod) return remote;
        return mergePaymentMethodFields(def, remote, localMethod);
      }),
    });
    savePaymentMethodsConfig(merged);
    return merged.paymentMethods;
  } catch (e1) {
    try {
      const remote = await fetchStoreConfigRemote();
      savePaymentMethodsConfig(normalizePaymentMethodsConfig(remote));
      return normalizePaymentMethodsConfig(remote).paymentMethods;
    } catch (e2) {
      /* local */
    }
  }

  return local.paymentMethods;
}
