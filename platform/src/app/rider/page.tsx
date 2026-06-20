'use client';

import { useMutation, useQuery, useSubscription, ApolloProvider } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { getApolloClient } from '@/lib/apollo-client';
import { clearAuth, getToken, getUserId } from '@/lib/auth';
import {
  ASSIGNED_ORDERS,
  UNASSIGNED_ORDERS,
  ASSIGN_ORDER,
  UPDATE_ORDER_STATUS_RIDER,
  SUBSCRIPTION_ASSIGN_RIDER,
  SUBSCRIPTION_UNASSIGNED,
} from '@/lib/graphql/operations';
import { Order } from '@/lib/types';
import OrderCard, { sumRiderDailyTotals } from '@/components/OrderCard';

function RiderDashboard() {
  const router = useRouter();
  const riderId = getUserId('rider');
  const [tab, setTab] = useState<'mine' | 'new'>('mine');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const { data: assignedData, refetch: refetchAssigned } = useQuery<{ assignedOrders: Order[] }>(
    ASSIGNED_ORDERS,
    { variables: { id: riderId }, skip: !riderId, fetchPolicy: 'network-only' }
  );

  const { data: unassignedData, refetch: refetchUnassigned } = useQuery<{ unassignedOrders: Order[] }>(
    UNASSIGNED_ORDERS,
    { skip: !getToken('rider'), fetchPolicy: 'network-only' }
  );

  useSubscription(SUBSCRIPTION_ASSIGN_RIDER, {
    variables: { riderId },
    skip: !riderId,
    onData: () => refetchAssigned(),
  });

  useSubscription(SUBSCRIPTION_UNASSIGNED, {
    skip: !getToken('rider'),
    onData: () => refetchUnassigned(),
  });

  const [assignOrder] = useMutation(ASSIGN_ORDER);
  const [updateStatus] = useMutation(UPDATE_ORDER_STATUS_RIDER);

  useEffect(() => {
    if (!getToken('rider')) router.replace('/rider/login');
  }, [router]);

  const allAssigned = assignedData?.assignedOrders || [];

  const myOrders = allAssigned.filter(
    (o) => !['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(o.order_status)
  );

  const newOrders = unassignedData?.unassignedOrders?.filter(
    (o) => o.order_status === 'ACCEPTED'
  ) || [];

  const daily = useMemo(() => sumRiderDailyTotals(allAssigned), [allAssigned]);

  const handleAssign = async (id: string) => {
    if (!riderId) {
      setErrorMsg('Sesión de repartidor inválida. Vuelve a iniciar sesión.');
      return;
    }
    setErrorMsg('');
    setAssigningId(id);
    try {
      await assignOrder({ variables: { id, riderId } });
      await refetchAssigned();
      await refetchUnassigned();
      setTab('mine');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'No se pudo tomar el pedido');
    } finally {
      setAssigningId(null);
    }
  };

  const handleStatus = async (id: string, status: string) => {
    setErrorMsg('');
    try {
      await updateStatus({ variables: { id, status, riderId } });
      await refetchAssigned();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar estado');
    }
  };

  const logout = () => {
    clearAuth('rider');
    router.push('/rider/login');
  };

  if (!getToken('rider')) return null;

  return (
    <div className="min-h-screen bg-blue-950 text-white">
      <header className="flex items-center justify-between border-b border-blue-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🛵</span>
          <h1 className="text-xl font-bold">Repartidor</h1>
        </div>
        <button onClick={logout} className="text-sm text-blue-300 hover:text-white">
          Salir
        </button>
      </header>

      <div className="flex border-b border-blue-800">
        {(['mine', 'new'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-3 text-sm font-semibold ${
              tab === t ? 'border-b-2 border-blue-400 text-white' : 'text-blue-400'
            }`}
          >
            {t === 'mine' ? `Mis entregas (${myOrders.length})` : `Disponibles (${newOrders.length})`}
          </button>
        ))}
      </div>

      {errorMsg && (
        <div className="mx-4 mt-3 rounded-lg bg-red-900/60 px-3 py-2 text-sm text-red-200">
          {errorMsg}
        </div>
      )}

      <div className="flex flex-col lg:flex-row">
        <div className="flex-1 space-y-3 p-4">
          {tab === 'mine' &&
            myOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                variant="rider"
                actions={
                  <>
                    {order.order_status === 'ASSIGNED' && (
                      <p className="text-sm text-blue-300">⏳ Cocina preparando — espera el aviso de listo</p>
                    )}
                    {order.order_status === 'READY' && (
                      <button
                        type="button"
                        onClick={() => handleStatus(order._id, 'PICKED')}
                        className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold hover:bg-purple-700"
                      >
                        📦 Recogí el pedido
                      </button>
                    )}
                    {order.order_status === 'PICKED' && (
                      <>
                        <a
                          href={`https://maps.google.com/?q=${order.delivery_address?.latitude},${order.delivery_address?.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg bg-gray-600 px-4 py-2 text-sm hover:bg-gray-500"
                        >
                          🗺️ Ver mapa
                        </a>
                        <button
                          type="button"
                          onClick={() => handleStatus(order._id, 'DELIVERED')}
                          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold hover:bg-green-700"
                        >
                          ✓ Entregado
                        </button>
                      </>
                    )}
                  </>
                }
              />
            ))}

          {tab === 'new' &&
            newOrders.map((order) => (
              <OrderCard
                key={order._id}
                order={order}
                variant="rider"
                actions={
                  <button
                    type="button"
                    disabled={assigningId === order._id}
                    onClick={() => handleAssign(order._id)}
                    className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold hover:bg-blue-600 disabled:opacity-50"
                  >
                    {assigningId === order._id ? 'Tomando…' : 'Tomar pedido'}
                  </button>
                }
              />
            ))}

          {tab === 'mine' && myOrders.length === 0 && (
            <p className="py-10 text-center text-blue-400">No tienes entregas activas</p>
          )}
          {tab === 'new' && newOrders.length === 0 && (
            <p className="py-10 text-center text-blue-400">No hay pedidos disponibles</p>
          )}
        </div>

        <aside className="border-t border-blue-800 p-4 lg:w-72 lg:border-l lg:border-t-0">
          <div className="rounded-xl bg-blue-900 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-blue-300">
              Resumen del día
            </h2>
            <p className="mt-1 text-xs text-blue-500">Cierra a las 11:59 PM</p>
            <dl className="mt-4 space-y-3">
              <div className="flex justify-between">
                <dt className="text-blue-300">Pedidos</dt>
                <dd className="font-bold">{daily.count}</dd>
              </div>
              <div className="flex justify-between border-t border-blue-800 pt-3">
                <dt className="text-blue-200">Total envíos</dt>
                <dd className="text-xl font-bold text-orange-400">${daily.delivery.toFixed(2)}</dd>
              </div>
            </dl>
          </div>
        </aside>
      </div>

      <Link href="/" className="block p-4 text-center text-sm text-blue-400 hover:text-white">
        ← Menú cliente
      </Link>
    </div>
  );
}

export default function RiderPage() {
  return (
    <ApolloProvider client={getApolloClient('rider')}>
      <RiderDashboard />
    </ApolloProvider>
  );
}
