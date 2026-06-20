/** Traduce estados de pedido y pago para el panel admin */
export function translateOrderStatus(status, t) {
  if (!status) return "";
  const map = {
    PENDING: t("status PENDING"),
    ACCEPTED: t("status ACCEPTED"),
    ASSIGNED: t("status ASSIGNED"),
    PICKED: t("status PICKED"),
    DELIVERED: t("status DELIVERED"),
    CANCELLED: t("status CANCELLED"),
    CANCELED: t("status CANCELLED"),
  };
  return map[status] || status;
}

export function translatePaymentStatus(status, t) {
  if (!status) return "";
  const map = {
    PAID: t("status PAID"),
    UNPAID: t("status UNPAID"),
    PENDING: t("status PENDING"),
  };
  return map[status] || status;
}

export function translatePaymentMethod(method) {
  if (!method) return "";
  if (method.indexOf("Pagomóvil") === 0 || method.indexOf("Pagomovil") === 0) {
    return method;
  }
  if (method === "COD" || method === "efectivo" || method === "cash") {
    return "Efectivo";
  }
  return method;
}

export function isCashPaymentMethod(method) {
  if (!method) return false;
  const id = String(method).toLowerCase();
  return id === "efectivo" || id === "cash" || id === "cod";
}

export function calcCashChange(tender, total) {
  if (!Number.isFinite(tender) || !Number.isFinite(total)) return 0;
  return Math.max(0, Math.round((tender - total) * 100) / 100);
}
