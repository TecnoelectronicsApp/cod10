'use client';

import { useQuery, ApolloProvider } from '@apollo/client/react';
import Link from 'next/link';
import { getApolloClient } from '@/lib/apollo-client';
import { getToken } from '@/lib/auth';
import { MY_ORDERS } from '@/lib/graphql/operations';
import { Order } from '@/lib/types';
import OrderCard from '@/components/OrderCard';

function OrdersContent() {
  const { data, loading } = useQuery<{ orders: Order[] }>(MY_ORDERS, {
    skip: !getToken('customer'),
  });

  if (!getToken('customer')) {
    return (
      <div className="mx-auto max-w-lg px-4 py-20 text-center">
        <p className="text-gray-500">Inicia sesión para ver tus pedidos</p>
        <Link href="/login?redirect=/orders" className="mt-2 text-orange-600 hover:underline">
          Iniciar sesión
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
      </div>
    );
  }

  const orders = data?.orders || [];

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <h1 className="mb-6 text-2xl font-bold">Mis pedidos</h1>
      {orders.length === 0 ? (
        <p className="text-center text-gray-500">Aún no tienes pedidos</p>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => (
            <OrderCard key={order._id} order={order} compact />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrdersPage() {
  return (
    <ApolloProvider client={getApolloClient('customer')}>
      <OrdersContent />
    </ApolloProvider>
  );
}
