'use client';

import { useEffect, useState } from 'react';
import { Order, OrderItem } from '@/lib/types';
import { cleanAddressDetails, resolvePaymentMethodLabel } from '@/lib/payment-labels';
import { calcCashChange, isCashPayment, parseCashTenderFromDetails } from '@/lib/cash-payment';
import { coordsValid, mapsLink } from '@/lib/google-maps';
import StatusBadge from './StatusBadge';
function formatCustomer(order: Order) {
  const parts: string[] = [];
  if (order.user?.name) parts.push(order.user.name);
  if (order.user?.phone) parts.push(order.user.phone);
  if (order.user?.email && !order.user.phone) parts.push(order.user.email);
  return parts.join(' · ');
}

function formatItemLine(item: OrderItem) {
  const qty = item.quantity ?? 1;
  const title = item.food?.title || 'Producto';
  const variation = item.variation?.title ? ` (${item.variation.title})` : '';
  const addonText = item.addons
    ?.flatMap((a) => a.options?.map((o) => o.title).filter(Boolean) || [])
    .join(', ');
  const addons = addonText ? ` + ${addonText}` : '';
  return `${qty}x ${title}${variation}${addons}`;
}

function paymentStatusLabel(status?: string) {
  if (status === 'PAID') return 'Pagado';
  return 'Pendiente';
}

function PaymentStatusBadge({
  status,
  onChange,
  editable,
}: {
  status?: string;
  onChange?: (status: 'PAID' | 'PENDING') => void | Promise<void>;
  editable?: boolean;
}) {
  const isPaid = status === 'PAID';
  if (editable && onChange) {
    return (
      <div className="flex gap-1">
        {(['PENDING', 'PAID'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => void onChange(s)}
            className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
              (status || 'PENDING') === s
                ? s === 'PAID'
                  ? 'bg-green-600 text-white'
                  : 'bg-yellow-500 text-black'
                : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
            }`}
          >
            {s === 'PAID' ? 'Pagado' : 'Pendiente'}
          </button>
        ))}
      </div>
    );
  }
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        isPaid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
      }`}
    >
      {paymentStatusLabel(status)}
    </span>
  );
}

export type KitchenCustomerInput = {
  name: string;
  phone: string;
  delivery_address: string;
  details: string;
};

export default function OrderCard({
  order,
  actions,
  compact,
  variant = 'default',
  onSaveCustomer,
  onPaymentStatusChange,
  saving,
}: {
  order: Order;
  actions?: React.ReactNode;
  compact?: boolean;
  variant?: 'default' | 'kitchen' | 'rider';
  onSaveCustomer?: (input: KitchenCustomerInput) => Promise<void>;
  onPaymentStatusChange?: (status: 'PAID' | 'PENDING') => Promise<void>;
  saving?: boolean;
}) {
  const isKitchen = variant === 'kitchen';
  const isRider = variant === 'rider';
  const isPickup = order.delivery_address?.label?.toLowerCase() === 'pickup';
  const customer = formatCustomer(order);
  const paymentLabel = resolvePaymentMethodLabel(
    order.payment_method,
    order.delivery_address?.details
  );
  const cashTender =
    isCashPayment(order.payment_method) && order.paid_amount != null
      ? order.paid_amount
      : parseCashTenderFromDetails(order.delivery_address?.details);
  const cashChange =
    cashTender != null && order.order_amount != null
      ? calcCashChange(cashTender, order.order_amount)
      : null;
  const addressDetails = cleanAddressDetails(order.delivery_address?.details);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<KitchenCustomerInput>({
    name: order.user?.name || '',
    phone: order.user?.phone || '',
    delivery_address: order.delivery_address?.delivery_address || '',
    details: order.delivery_address?.details || '',
  });

  useEffect(() => {
    setForm({
      name: order.user?.name || '',
      phone: order.user?.phone || '',
      delivery_address: order.delivery_address?.delivery_address || '',
      details: order.delivery_address?.details || '',
    });
  }, [order]);

  const handleSave = async () => {
    if (onSaveCustomer) {
      await onSaveCustomer(form);
      setEditing(false);
    }
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 text-gray-900 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {isKitchen || isRider ? (
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
              <span className="text-lg font-bold text-gray-900">#{order.order_id}</span>
              {!editing && customer && (
                <>
                  <span className="text-gray-400">·</span>
                  <span className="text-base font-medium text-gray-700">{customer}</span>
                </>
              )}
            </div>
          ) : (
            <>
              <p className="font-bold text-gray-900">#{order.order_id}</p>
              {customer && <p className="text-sm text-gray-600">{customer}</p>}
            </>
          )}

          {isKitchen && editing && (
            <div className="mt-2 space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Nombre cliente"
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                />
                <input
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Teléfono"
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
                />
              </div>
              <input
                value={form.delivery_address}
                onChange={(e) => setForm((f) => ({ ...f, delivery_address: e.target.value }))}
                placeholder="Dirección"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
              />
              <input
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                placeholder="Detalles (edificio, piso, referencia…)"
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-sm text-gray-900"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={saving}
                  onClick={handleSave}
                  className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? 'Guardando…' : 'Guardar datos'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  className="rounded-lg bg-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {isKitchen && !editing && !compact && (
            <div className="mt-1.5 space-y-1 text-sm text-gray-600">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isPickup ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {isPickup ? '🏪 Pickup' : '🛵 Delivery'}
                </span>
                {(order.delivery_address?.delivery_address || addressDetails) && (
                  <span>
                    📍 {order.delivery_address?.delivery_address}
                    {addressDetails && ` — ${addressDetails}`}
                  </span>
                )}
                <span className="text-gray-400">·</span>
                <PaymentStatusBadge
                  status={order.payment_status}
                  editable
                  onChange={onPaymentStatusChange}
                />
                {paymentLabel && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span className="font-medium text-gray-700">{paymentLabel}</span>
                  </>
                )}
              </div>
              {cashTender != null && (
                <p className="rounded-lg bg-amber-50 px-2.5 py-1.5 text-sm font-semibold text-amber-900">
                  💵 Paga con ${cashTender.toFixed(2)}
                  {cashChange != null && (
                    <span className="ml-2 text-green-700">· Vuelto ${cashChange.toFixed(2)}</span>
                  )}
                </p>
              )}
              {onSaveCustomer && (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800"
                >
                  ✏️ Editar cliente / dirección
                </button>
              )}
            </div>
          )}

          {isRider && !compact && (
            <div className="mt-1.5 space-y-1 text-sm text-gray-600">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    isPickup ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}
                >
                  {isPickup ? '🏪 Pickup' : '🛵 Delivery'}
                </span>
                {order.delivery_address?.delivery_address && (
                  <span>
                    📍 {order.delivery_address.delivery_address}
                    {addressDetails && ` — ${addressDetails}`}
                  </span>
                )}
                {paymentLabel && (
                  <>
                    <span className="text-gray-400">·</span>
                    <span>{paymentLabel}</span>
                  </>
                )}
              </div>
              {cashTender != null && (
                <p className="text-sm font-semibold text-amber-900">
                  💵 Billete ${cashTender.toFixed(2)}
                  {cashChange != null && (
                    <span className="ml-2 text-green-700">Vuelto ${cashChange.toFixed(2)}</span>
                  )}
                </p>
              )}
              {!isPickup &&
                coordsValid(
                  order.delivery_address?.latitude,
                  order.delivery_address?.longitude
                ) && (
                  <a
                    href={mapsLink(
                      order.delivery_address!.latitude!,
                      order.delivery_address!.longitude!
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 underline hover:text-blue-800"
                  >
                    🗺️ Abrir ubicación exacta en Google Maps
                  </a>
                )}
            </div>
          )}
          {!isKitchen && !isRider && !compact && order.delivery_address?.delivery_address && (
            <p className="mt-1 text-sm text-gray-500">
              📍 {order.delivery_address.delivery_address}
              {order.delivery_address.details && ` — ${order.delivery_address.details}`}
              {order.payment_method && ` · Pago: ${order.payment_method}`}
            </p>
          )}
        </div>
        <StatusBadge status={order.order_status} />
      </div>

      <div
        className={`mt-3 border-t border-gray-200 pt-3 ${
          isKitchen || isRider ? 'rounded-lg bg-gray-50 px-3 py-2' : ''
        }`}
      >
        {isKitchen && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Preparar
          </p>
        )}
        {isRider && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
            Entregar
          </p>
        )}
        <ul className={isKitchen || isRider ? 'space-y-2' : 'space-y-1'}>
          {order.items?.map((item, i) => (
            <li
              key={i}
              className={`${
                isKitchen || isRider ? 'text-base font-medium text-gray-900' : 'flex justify-between gap-3 text-sm text-gray-800'
              }`}
            >
              <span className="leading-snug">{formatItemLine(item)}</span>
              {!isKitchen && !isRider && item.variation?.price != null && (
                <span className="shrink-0 text-gray-500">
                  ${(item.variation.price * (item.quantity ?? 1)).toFixed(2)}
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>

      {isRider && (
        <div className="mt-3 flex items-center justify-end border-t border-gray-100 pt-3 text-sm">
          <span className="text-base font-bold text-green-700">
            Envío: ${(order.delivery_charges ?? 0).toFixed(2)}
          </span>
        </div>
      )}
      {!isKitchen && !isRider && (
        <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-3">
          <span className="font-semibold text-orange-600">Total: ${order.order_amount?.toFixed(2)}</span>
          {order.payment_method && (
            <span className="text-xs text-gray-400">{order.payment_method}</span>
          )}
        </div>
      )}

      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function isOrderToday(createdAt?: string) {
  if (!createdAt) return false;
  const d = new Date(createdAt);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export function sumRiderDailyTotals(orders: Order[]) {
  const today = orders.filter((o) => isOrderToday(o.createdAt));
  return {
    count: today.length,
    delivery: today.reduce((s, o) => s + (o.delivery_charges ?? 0), 0),
    total: today.reduce((s, o) => s + (o.order_amount ?? 0), 0),
  };
}
