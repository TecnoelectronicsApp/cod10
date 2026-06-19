import { bcv_api_url } from "../config/config";

export const PAYMENT_METHODS_STORAGE_KEY = "cod10-payment-methods";

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

export function getPaymentMethodsConfig() {
  try {
    const raw = localStorage.getItem(PAYMENT_METHODS_STORAGE_KEY);
    if (raw) {
      return Object.assign({}, defaultPaymentMethodsConfig, JSON.parse(raw));
    }
  } catch (e) {
    console.error(e);
  }
  return Object.assign({}, defaultPaymentMethodsConfig);
}

export function savePaymentMethodsConfig(config) {
  localStorage.setItem(PAYMENT_METHODS_STORAGE_KEY, JSON.stringify(config));
}

function getApiBase() {
  return (bcv_api_url || "http://localhost:8000").replace(/\/$/, "");
}

export async function fetchStoreConfigRemote() {
  const res = await fetch(getApiBase() + "/store-config");
  if (!res.ok) throw new Error("No se pudo cargar la configuración remota");
  return res.json();
}

export async function saveStoreConfigRemote(config) {
  const res = await fetch(getApiBase() + "/store-config", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(config),
  });
  if (!res.ok) throw new Error("No se pudo guardar en la API BCV");
  return res.json();
}

export async function syncPaymentMethodsToServer(config) {
  savePaymentMethodsConfig(config);
  try {
    await saveStoreConfigRemote(config);
    return { ok: true, remote: true };
  } catch (e) {
    return { ok: true, remote: false, error: e.message };
  }
}
