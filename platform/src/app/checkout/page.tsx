'use client';

import { useMutation, useQuery, ApolloProvider } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApolloClient } from '@/lib/apollo-client';
import { useCart } from '@/lib/cart-context';
import { getToken } from '@/lib/auth';
import { CONFIGURATION, PLACE_ORDER, PROFILE } from '@/lib/graphql/operations';

function CheckoutContent() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const [address, setAddress] = useState({
    label: 'Casa',
    delivery_address: '',
    details: '',
    latitude: '0',
    longitude: '0',
  });
  const [error, setError] = useState('');

  const { data: configData } = useQuery<{ configuration: { delivery_charges: number; currency_symbol: string } }>(CONFIGURATION);
  const { data: profileData } = useQuery<{ profile: { addresses: { label: string; delivery_address: string; details: string; latitude: string; longitude: string; selected: boolean }[] } }>(PROFILE, { skip: !getToken('customer') });

  const [placeOrder, { loading }] = useMutation(PLACE_ORDER);

  const delivery = configData?.configuration?.delivery_charges ?? 0;
  const symbol = configData?.configuration?.currency_symbol || '$';
  const grandTotal = total + delivery;

  const selectedAddress = profileData?.profile?.addresses?.find((a: { selected: boolean }) => a.selected);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!getToken('customer')) {
      router.push('/login?redirect=/checkout');
      return;
    }

    const addr = selectedAddress || address;
    if (!addr.delivery_address) {
      setError('Ingresa una dirección de entrega');
      return;
    }

    const orderInput = items.map((item) => ({
      food: item.foodId,
      quantity: item.quantity,
      variation: item.variation._id,
      addons: item.addons.map((a) => ({
        _id: a._id,
        options: a.options.map((o) => o._id),
      })),
    }));

    try {
      await placeOrder({
        variables: {
          orderInput,
          paymentMethod: 'COD',
          address: {
            label: addr.label || 'Casa',
            delivery_address: addr.delivery_address,
            details: addr.details || '',
            latitude: String(addr.latitude || '0'),
            longitude: String(addr.longitude || '0'),
          },
        },
      });
      clearCart();
      router.push('/orders');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al crear el pedido');
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-gray-500">No hay items en el carrito</p>
        <Link href="/" className="mt-2 text-orange-600 hover:underline">Ver menú</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

      {!getToken('customer') && (
        <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          <Link href="/login?redirect=/checkout" className="font-semibold underline">
            Inicia sesión
          </Link>{' '}
          para completar tu pedido
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {!selectedAddress && (
          <>
            <div>
              <label className="mb-1 block text-sm font-medium">Dirección</label>
              <input
                required
                value={address.delivery_address}
                onChange={(e) => setAddress({ ...address, delivery_address: e.target.value })}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Calle, número, colonia"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Detalles</label>
              <input
                value={address.details}
                onChange={(e) => setAddress({ ...address, details: e.target.value })}
                className="w-full rounded-lg border px-3 py-2"
                placeholder="Piso, referencias..."
              />
            </div>
          </>
        )}

        {selectedAddress && (
          <div className="rounded-lg bg-green-50 p-3 text-sm">
            📍 {selectedAddress.delivery_address} — {selectedAddress.details}
          </div>
        )}

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{symbol}{total.toFixed(2)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span>Envío</span>
            <span>{symbol}{delivery.toFixed(2)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
            <span>Total</span>
            <span className="text-orange-600">{symbol}{grandTotal.toFixed(2)}</span>
          </div>
          <p className="mt-2 text-xs text-gray-400">Pago contra entrega (COD)</p>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Procesando...' : 'Confirmar pedido'}
        </button>
      </form>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <ApolloProvider client={getApolloClient('customer')}>
      <CheckoutContent />
    </ApolloProvider>
  );
}
