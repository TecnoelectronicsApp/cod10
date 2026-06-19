'use client';

import { Order } from '@/lib/types';
import StatusBadge from './StatusBadge';

export default function OrderCard({
  order,
  actions,
  compact,
}: {
  order: Order;
  actions?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-gray-900">#{order.order_id}</p>
          {order.user?.name && (
            <p className="text-sm text-gray-600">{order.user.name} · {order.user.phone}</p>
          )}
          {!compact && order.delivery_address?.delivery_address && (
            <p className="mt-1 text-sm text-gray-500">
              📍 {order.delivery_address.delivery_address}
              {order.delivery_address.details && ` — ${order.delivery_address.details}`}
            </p>
          )}
        </div>
        <StatusBadge status={order.order_status} />
      </div>

      <ul className="mt-3 space-y-1 border-t border-gray-100 pt-3">
        {order.items?.map((item, i) => (
          <li key={i} className="flex justify-between text-sm">
            <span>
              {item.quantity}x {item.food?.title}
              {item.variation?.title && ` (${item.variation.title})`}
              {(() => {
                const addonText = item.addons
                  ?.flatMap((a) => a.options?.map((o) => o.title).filter(Boolean) || [])
                  .join(', ');
                return addonText ? (
                  <span className="text-gray-400"> + {addonText}</span>
                ) : null;
              })()}
            </span>
            {item.variation?.price != null && (
              <span className="text-gray-500">${(item.variation.price * item.quantity).toFixed(2)}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center justify-between">
        <span className="font-semibold text-orange-600">${order.order_amount?.toFixed(2)}</span>
        {order.payment_method && (
          <span className="text-xs text-gray-400">{order.payment_method}</span>
        )}
      </div>

      {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}
