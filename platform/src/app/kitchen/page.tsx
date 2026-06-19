'use client';

import { useMutation, useQuery, useSubscription, ApolloProvider } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';
import { getApolloClient } from '@/lib/apollo-client';
import { clearAuth, getToken } from '@/lib/auth';
import {
  ALL_ORDERS,
  SUBSCRIBE_PLACE_ORDER,
  UPDATE_ORDER_STATUS,
} from '@/lib/graphql/operations';
import { playKitchenBell } from '@/lib/kitchen-sound';
import { Order } from '@/lib/types';
import OrderCard from '@/components/OrderCard';

const REFRESH_SECONDS = 10;
const KITCHEN_STATUSES = ['PENDING', 'ACCEPTED'];

function filterKitchenOrders(list: Order[]) {
  return list.filter((o) => KITCHEN_STATUSES.includes(o.order_status));
}

function KitchenBoard() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [countdown, setCountdown] = useState(REFRESH_SECONDS);
  const knownPendingRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);

  const { data, refetch, loading } = useQuery<{ allOrders: Order[] }>(ALL_ORDERS, {
    variables: { page: 0, rows: 50 },
    skip: !getToken('admin'),
    fetchPolicy: 'network-only',
  });

  const applyOrders = useCallback((list: Order[], playSoundOnNewPending: boolean) => {
    const kitchenOrders = filterKitchenOrders(list);
    const pendingIds = kitchenOrders
      .filter((o) => o.order_status === 'PENDING')
      .map((o) => o._id);

    if (playSoundOnNewPending && !initialLoadRef.current) {
      const hasNewPending = pendingIds.some((id) => !knownPendingRef.current.has(id));
      if (hasNewPending) {
        playKitchenBell();
      }
    }

    knownPendingRef.current = new Set(pendingIds);
    initialLoadRef.current = false;
    setOrders(kitchenOrders);
  }, []);

  const doRefresh = useCallback(async () => {
    const result = await refetch({ page: 0, rows: 50 });
    if (result.data?.allOrders) {
      applyOrders(result.data.allOrders, true);
    }
    setCountdown(REFRESH_SECONDS);
  }, [refetch, applyOrders]);

  const prevCountdownRef = useRef(REFRESH_SECONDS);

  useSubscription(SUBSCRIBE_PLACE_ORDER, {
    skip: !getToken('admin'),
    onData: () => {
      playKitchenBell();
      doRefresh();
    },
  });

  const [updateStatus] = useMutation(UPDATE_ORDER_STATUS);

  useEffect(() => {
    if (!getToken('admin')) {
      router.replace('/kitchen/login');
    }
  }, [router]);

  useEffect(() => {
    if (data?.allOrders) {
      applyOrders(data.allOrders, true);
    }
  }, [data, applyOrders]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? REFRESH_SECONDS : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (
      countdown === REFRESH_SECONDS &&
      prevCountdownRef.current <= 1 &&
      prevCountdownRef.current !== REFRESH_SECONDS
    ) {
      doRefresh();
    }
    prevCountdownRef.current = countdown;
  }, [countdown, doRefresh]);

  const pending = orders.filter((o) => o.order_status === 'PENDING');
  const preparing = orders.filter((o) => o.order_status === 'ACCEPTED');

  const handleAccept = async (id: string) => {
    await updateStatus({ variables: { id, status: 'ACCEPTED' } });
    await doRefresh();
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Motivo de cancelación:');
    if (reason) {
      await updateStatus({ variables: { id, status: 'CANCELLED', reason } });
      await doRefresh();
    }
  };

  const logout = () => {
    clearAuth('admin');
    router.push('/kitchen/login');
  };

  if (!getToken('admin')) return null;

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <header className="flex items-center justify-between border-b border-gray-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">👨‍🍳</span>
          <h1 className="text-xl font-bold">Cocina Codigo 10</h1>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              prevCountdownRef.current = REFRESH_SECONDS;
              doRefresh();
            }}
            disabled={loading}
            className="rounded-lg bg-gray-700 px-3 py-1.5 text-sm hover:bg-gray-600 disabled:opacity-60"
          >
            🔄 Actualizar ({countdown}s)
          </button>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-gray-400 hover:text-white"
          >
            Salir
          </button>
        </div>
      </header>

      {loading && orders.length === 0 && (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-green-500 border-t-transparent" />
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-yellow-400">
            🔔 Nuevos pedidos
            <span className="rounded-full bg-yellow-500 px-2 py-0.5 text-xs text-black">
              {pending.length}
            </span>
          </h2>
          <div className="space-y-3">
            {pending.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                actions={
                  <>
                    <button
                      type="button"
                      onClick={() => handleAccept(order._id)}
                      className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-700"
                    >
                      ✓ Aceptar / Preparar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCancel(order._id)}
                      className="rounded-lg bg-red-600/80 px-4 py-2 text-sm hover:bg-red-600"
                    >
                      ✕ Cancelar
                    </button>
                  </>
                }
              />
            ))}
            {pending.length === 0 && (
              <p className="rounded-xl bg-gray-800 p-6 text-center text-gray-500">
                Sin pedidos nuevos
              </p>
            )}
          </div>
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-blue-400">
            🔥 En preparación
            <span className="rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
              {preparing.length}
            </span>
          </h2>
          <div className="space-y-3">
            {preparing.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                actions={
                  <span className="text-sm text-blue-300">
                    Esperando repartidor...
                  </span>
                }
              />
            ))}
            {preparing.length === 0 && (
              <p className="rounded-xl bg-gray-800 p-6 text-center text-gray-500">
                Sin pedidos en preparación
              </p>
            )}
          </div>
        </section>
      </div>

      <Link href="/" className="block p-4 text-center text-sm text-gray-500 hover:text-white">
        ← Menú cliente
      </Link>
    </div>
  );
}

export default function KitchenPage() {
  return (
    <ApolloProvider client={getApolloClient('admin')}>
      <KitchenBoard />
    </ApolloProvider>
  );
}
