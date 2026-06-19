const BCV_PUBLIC_URL = "https://ve.dolarapi.com/v1/dolares/oficial";

export async function fetchBcvRatePublic() {
  const res = await fetch(BCV_PUBLIC_URL, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("No se pudo obtener la tasa BCV pública");
  }
  const data = await res.json();
  const rate = Number(
    data.promedio != null
      ? data.promedio
      : data.valor != null
      ? data.valor
      : data.venta
  );
  if (!rate || rate <= 0 || isNaN(rate)) {
    throw new Error("Tasa BCV inválida");
  }
  return {
    rate: rate,
    rateDate: data.fechaActualizacion || data.fecha || null,
    fetchedAt: new Date().toISOString(),
  };
}
