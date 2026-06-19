'use client';

import { useMutation, useQuery, useSubscription, ApolloProvider } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
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
import OrderCard from '@/components/OrderCard';

function RiderDashboard() {
  const router = useRouter();
  const riderId = getUserId('rider');
  const [tab, setTab] = useState<'mine' | 'new'>('mine');

  const { data: assignedData, refetch: refetchAssigned } = useQuery<{ assignedOrders: Order[] }>(
    ASSIGNED_ORDERS,
    { variables: { id: riderId }, skip: !riderId }
  );

  const { data: unassignedData, refetch: refetchUnassigned } = useQuery<{ unassignedOrders: Order[] }>(
    UNASSIGNED_ORDERS,
    { skip: !getToken('rider') }
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

  const myOrders = assignedData?.assignedOrders?.filter(
    (o) => !['DELIVERED', 'CANCELLED', 'COMPLETED'].includes(o.order_status)
  ) || [];

  const newOrders = unassignedData?.unassignedOrders?.filter(
    (o) => o.order_status === 'ACCEPTED'
  ) || [];

  const handleAssign = async (id: string) => {
    await assignOrder({ variables: { id } });
    refetchAssigned();
    refetchUnassigned();
    setTab('mine');
  };

  const handleStatus = async (id: string, status: string) => {
    await updateStatus({ variables: { id, status } });
    refetchAssigned();
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

      <div className="space-y-3 p-4">
        {tab === 'mine' &&
          myOrders.map((order) => (
            <OrderCard
              key={order._id}
              order={order}
              actions={
                <>
                  {order.order_status === 'ACCEPTED' && (
                    <button
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
              actions={
                <button
                  onClick={() => handleAssign(order._id)}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold hover:bg-blue-600"
                >
                  Tomar pedido
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
