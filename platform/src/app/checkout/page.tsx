'use client';

import { useMutation, useQuery, ApolloProvider } from '@apollo/client/react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getApolloClient } from '@/lib/apollo-client';
import { useCart } from '@/lib/cart-context';
import { getToken, clearAuth } from '@/lib/auth';
import { CONFIGURATION, PLACE_ORDER, PROFILE } from '@/lib/graphql/operations';
import { useBcvRate } from '@/hooks/useBcvRate';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import DualPrice from '@/components/DualPrice';
import PaymentMethodSelector from '@/components/PaymentMethodSelector';
import FulfillmentSelector, { FulfillmentMode } from '@/components/FulfillmentSelector';
import {
  buildPaymentMethodLabel,
  getEnabledPaymentMethods,
  StoreLocation,
} from '@/lib/store-config';
import { coordsValid } from '@/lib/google-maps';
import {
  calcDeliveryFeeFromCoords,
  DELIVERY_BASE_FEE,
  DELIVERY_INCLUDED_KM,
} from '@/lib/delivery-pricing';

const LocationPicker = dynamic(() => import('@/components/LocationPicker'), {
  ssr: false,
  loading: () => (
    <div className="flex h-64 items-center justify-center rounded-xl border bg-gray-50 text-sm text-gray-500">
      Cargando mapa…
    </div>
  ),
});

function CheckoutContent() {
  const router = useRouter();
  const { items, total, clearCart } = useCart();
  const { rate } = useBcvRate();
  const { config: storeConfig, loading: configLoading } = useStoreConfig();
  const [fulfillment, setFulfillment] = useState<FulfillmentMode>('delivery');
  const [address, setAddress] = useState({
    label: 'Casa',
    delivery_address: '',
    details: '',
    latitude: '',
    longitude: '',
  });
  const [error, setError] = useState('');
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    setIsLoggedIn(Boolean(getToken('customer')));
  }, []);

  const { data: configData } = useQuery<{ configuration: { delivery_charges: number; currency_symbol: string } }>(CONFIGURATION);
  const { data: profileData } = useQuery<{ profile: { addresses: { label: string; delivery_address: string; details: string; latitude: string; longitude: string; selected: boolean }[] } }>(PROFILE, { skip: !getToken('customer') });

  const [placeOrder, { loading }] = useMutation(PLACE_ORDER);

  const storeLocation: StoreLocation = storeConfig?.storeLocation || {
    name: 'Codigo 10',
    address: 'Codigo 10',
    latitude: '10.490771409353307',
    longitude: '-66.95274734821183',
    details: 'Retiro en mostrador',
  };

  const symbol = configData?.configuration?.currency_symbol || '$';

  const selectedAddress = profileData?.profile?.addresses?.find((a: { selected: boolean }) => a.selected);

  const customerCoords = useMemo(() => {
    if (fulfillment === 'pickup') return { lat: '', lng: '' };
    if (selectedAddress) {
      return {
        lat: address.latitude || selectedAddress.latitude || '',
        lng: address.longitude || selectedAddress.longitude || '',
      };
    }
    return { lat: address.latitude, lng: address.longitude };
  }, [fulfillment, selectedAddress, address.latitude, address.longitude]);

  const { fee: shipping, distanceKm } = useMemo(() => {
    if (fulfillment === 'pickup') return { fee: 0, distanceKm: null as number | null };
    return calcDeliveryFeeFromCoords(customerCoords.lat, customerCoords.lng);
  }, [fulfillment, customerCoords.lat, customerCoords.lng]);

  const grandTotal = total + shipping;

  const paymentMethods = storeConfig ? getEnabledPaymentMethods(storeConfig) : [];

  useEffect(() => {
    if (paymentMethods.length && !selectedPaymentId) {
      setSelectedPaymentId(paymentMethods[0].id);
    }
  }, [paymentMethods, selectedPaymentId]);

  const deliveryAddressLine = useMemo(() => {
    if (fulfillment === 'pickup') return storeLocation.address;
    if (selectedAddress) return selectedAddress.delivery_address;
    return address.delivery_address;
  }, [fulfillment, storeLocation.address, selectedAddress, address.delivery_address]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = getToken('customer');
    if (!token) {
      router.push('/login?redirect=/checkout');
      return;
    }

    if (!selectedPaymentId || !paymentMethods.length) {
      setError('Selecciona un método de pago');
      return;
    }

    const method = paymentMethods.find((m) => m.id === selectedPaymentId);
    if (!method) {
      setError('Método de pago no válido');
      return;
    }

    let orderAddress;

    if (fulfillment === 'pickup') {
      orderAddress = {
        label: 'Pickup',
        delivery_address: storeLocation.address,
        details: [
          storeLocation.details || 'Retiro en local',
          `Pago: ${buildPaymentMethodLabel(method)}`,
        ]
          .filter(Boolean)
          .join(' | '),
        latitude: String(storeLocation.latitude),
        longitude: String(storeLocation.longitude),
      };
    } else {
      const addr = selectedAddress || address;
      if (!addr.delivery_address?.trim()) {
        setError('Ingresa una dirección de entrega');
        return;
      }
      const lat = selectedAddress?.latitude || address.latitude;
      const lng = selectedAddress?.longitude || address.longitude;
      if (!coordsValid(lat, lng)) {
        setError('Marca tu ubicación exacta en el mapa o usa “Usar mi ubicación”');
        return;
      }
      orderAddress = {
        label: 'Delivery',
        delivery_address: addr.delivery_address.trim(),
        details: [addr.details, `Pago: ${buildPaymentMethodLabel(method)}`]
          .filter(Boolean)
          .join(' | '),
        latitude: String(lat),
        longitude: String(lng),
      };
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
          paymentMethod: method.id,
          address: orderAddress,
        },
      });
      clearCart();
      router.push('/orders');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Error al crear el pedido';
      if (msg.includes('No autorizado') || msg.includes('autorizado')) {
        clearAuth('customer');
        setError('Sesión expirada. Inicia sesión de nuevo para confirmar tu pedido.');
        router.push('/login?redirect=/checkout');
        return;
      }
      setError(
        msg === 'Invalid Payment Method'
          ? 'Método de pago no válido para el servidor. Intenta de nuevo.'
          : msg
      );
    }
  };

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-gray-500">No hay items en el carrito</p>
        <Link href="/" className="mt-2 text-orange-600 hover:underline">
          Ver menú
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Checkout</h1>

      {!isLoggedIn && (
        <div className="mb-4 rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          <Link href="/login?redirect=/checkout" className="font-semibold underline">
            Inicia sesión
          </Link>{' '}
          para completar tu pedido
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="mb-2 block text-sm font-medium">¿Cómo recibes tu pedido?</label>
          <FulfillmentSelector value={fulfillment} onChange={setFulfillment} />
        </div>

        {fulfillment === 'pickup' ? (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-900">
            <p className="font-semibold">🏪 Retiro en {storeLocation.name}</p>
            <p className="mt-1">{storeLocation.address}</p>
            {storeLocation.details && (
              <p className="mt-1 text-green-800">{storeLocation.details}</p>
            )}
            <p className="mt-2 text-xs text-green-700">Sin costo de envío</p>
          </div>
        ) : (
          <>
            {!selectedAddress && (
              <>
                <div>
                  <label className="mb-1 block text-sm font-medium">Dirección</label>
                  <input
                    required
                    value={address.delivery_address}
                    onChange={(e) =>
                      setAddress({ ...address, delivery_address: e.target.value })
                    }
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Calle, número, urbanización"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium">Detalles</label>
                  <input
                    value={address.details}
                    onChange={(e) => setAddress({ ...address, details: e.target.value })}
                    className="w-full rounded-lg border px-3 py-2"
                    placeholder="Piso, casa, referencias…"
                  />
                </div>
                <LocationPicker
                  latitude={address.latitude}
                  longitude={address.longitude}
                  onChange={(lat, lng) =>
                    setAddress((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                  }
                  onAddressSuggestion={(line) =>
                    setAddress((prev) =>
                      prev.delivery_address.trim()
                        ? prev
                        : { ...prev, delivery_address: line }
                    )
                  }
                />
              </>
            )}

            {selectedAddress && (
              <>
                <div className="rounded-lg bg-green-50 p-3 text-sm">
                  📍 {selectedAddress.delivery_address}
                  {selectedAddress.details ? ` — ${selectedAddress.details}` : ''}
                </div>
                <LocationPicker
                  latitude={selectedAddress.latitude || address.latitude}
                  longitude={selectedAddress.longitude || address.longitude}
                  onChange={(lat, lng) =>
                    setAddress((prev) => ({ ...prev, latitude: lat, longitude: lng }))
                  }
                />
              </>
            )}
          </>
        )}

        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h2 className="mb-3 font-semibold text-gray-800">Resumen</h2>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <DualPrice amount={total} symbol={symbol} exchangeRate={rate} />
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span>
              {fulfillment === 'pickup'
                ? 'Retiro en local'
                : distanceKm != null
                  ? `Envío (${distanceKm.toFixed(1)} km)`
                  : 'Envío (hasta 4 km)'}
            </span>
            {fulfillment === 'pickup' ? (
              <span className="font-medium text-green-600">Gratis</span>
            ) : (
              <DualPrice amount={shipping} symbol={symbol} exchangeRate={rate} />
            )}
          </div>
          {fulfillment === 'delivery' && (
            <p className="mt-1 text-xs text-gray-400">
              ${DELIVERY_BASE_FEE.toFixed(2)} hasta {DELIVERY_INCLUDED_KM} km · +$0.50/km adicional
            </p>
          )}
          <div className="mt-2 flex justify-between border-t pt-2 text-lg font-bold">
            <span>Total</span>
            <span className="text-orange-600">
              <DualPrice amount={grandTotal} symbol={symbol} exchangeRate={rate} />
            </span>
          </div>
          {fulfillment === 'delivery' && deliveryAddressLine && (
            <p className="mt-2 text-xs text-gray-500">Entrega: {deliveryAddressLine}</p>
          )}
          {rate && (
            <p className="mt-2 text-xs text-gray-400">
              Tasa BCV: 1 USD = Bs.{rate.toFixed(2)}
            </p>
          )}
        </div>

        {!configLoading && paymentMethods.length > 0 ? (
          <div className="rounded-xl bg-white p-4 shadow-sm">
            <PaymentMethodSelector
              methods={paymentMethods}
              selectedId={selectedPaymentId}
              onSelect={setSelectedPaymentId}
            />
          </div>
        ) : (
          !configLoading && (
            <p className="text-sm text-red-500">No hay métodos de pago configurados.</p>
          )
        )}

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || configLoading || !paymentMethods.length || !isLoggedIn}
          className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {!isLoggedIn
            ? 'Inicia sesión para confirmar'
            : loading
              ? 'Procesando...'
              : 'Confirmar pedido'}
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
