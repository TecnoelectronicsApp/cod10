'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart-context';
import { useBcvRate } from '@/hooks/useBcvRate';
import DualPrice from '@/components/DualPrice';
import { useQuery, ApolloProvider } from '@apollo/client/react';
import { CONFIGURATION } from '@/lib/graphql/operations';
import { getApolloClient } from '@/lib/apollo-client';

function CartContent() {
  const { items, updateQuantity, removeItem, total } = useCart();
  const { rate } = useBcvRate();
  const { data: configData } = useQuery<{ configuration: { currency_symbol: string; delivery_charges: number } }>(CONFIGURATION);
  const symbol = configData?.configuration?.currency_symbol || '$';
  const delivery = configData?.configuration?.delivery_charges ?? 0;

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-5xl">🛒</p>
        <h1 className="mt-4 text-xl font-bold">Tu carrito está vacío</h1>
        <Link href="/" className="mt-4 inline-block text-orange-600 hover:underline">
          Ver menú
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Carrito</h1>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.key} className="flex gap-4 rounded-xl bg-white p-4 shadow-sm">
            {item.img_url ? (
              <img src={item.img_url} alt={item.title} className="h-16 w-16 rounded-lg object-cover" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-gray-100 text-2xl">🍽️</div>
            )}
            <div className="flex-1">
              <p className="font-semibold">{item.title}</p>
              <p className="text-sm text-gray-500">{item.variation.title}</p>
              <p className="mt-1 font-bold text-orange-600">
                <DualPrice amount={item.unitPrice} symbol={symbol} exchangeRate={rate} />
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <button onClick={() => removeItem(item.key)} className="text-xs text-red-500">Eliminar</button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => updateQuantity(item.key, item.quantity - 1)}
                  className="flex h-7 w-7 items-center justify-center rounded border"
                >
                  −
                </button>
                <span className="w-4 text-center text-sm">{item.quantity}</span>
                <button
                  onClick={() => updateQuantity(item.key, item.quantity + 1)}
                  className="flex h-7 w-7 items-center justify-center rounded border"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-white p-4 shadow-sm">
        <div className="flex justify-between text-sm">
          <span>Subtotal</span>
          <DualPrice amount={total} symbol={symbol} exchangeRate={rate} />
        </div>
        <div className="mt-1 flex justify-between text-sm text-gray-600">
          <span>Envío estimado</span>
          <DualPrice amount={delivery} symbol={symbol} exchangeRate={rate} />
        </div>
        <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
          <span>Total</span>
          <span className="text-orange-600">
            <DualPrice amount={total + delivery} symbol={symbol} exchangeRate={rate} />
          </span>
        </div>
        <Link
          href="/checkout"
          className="mt-4 block rounded-xl bg-orange-500 py-3 text-center font-semibold text-white hover:bg-orange-600"
        >
          Ir al checkout
        </Link>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <ApolloProvider client={getApolloClient('customer')}>
      <CartContent />
    </ApolloProvider>
  );
}
