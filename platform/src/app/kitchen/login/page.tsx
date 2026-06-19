'use client';

import { useMutation, ApolloProvider } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApolloClient } from '@/lib/apollo-client';
import { saveAdminAuth, getToken } from '@/lib/auth';
import { ADMIN_LOGIN } from '@/lib/graphql/operations';

function KitchenLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [login, { loading }] = useMutation(ADMIN_LOGIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await login({ variables: { email, password } });
      if (data && typeof data === 'object' && 'adminLogin' in data) {
        saveAdminAuth((data as { adminLogin: { userId: string; token: string; name: string; email: string } }).adminLogin);
      }
      router.push('/kitchen');
    } catch {
      setError('Credenciales incorrectas');
    }
  };

  if (getToken('admin')) {
    router.replace('/kitchen');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <span className="text-5xl">👨‍🍳</span>
          <h1 className="mt-2 text-2xl font-bold">Pantalla de Cocina</h1>
          <p className="text-gray-400">Acceso para el equipo de cocina</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-gray-800 p-6">
          <input
            type="email"
            required
            placeholder="Email admin"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white"
          />
          <input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-white"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-green-600 py-2.5 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar a cocina'}
          </button>
        </form>
        <Link href="/" className="mt-4 block text-center text-sm text-gray-500 hover:text-white">
          ← Volver al menú
        </Link>
      </div>
    </div>
  );
}

export default function KitchenLoginPage() {
  return (
    <ApolloProvider client={getApolloClient('admin')}>
      <KitchenLoginForm />
    </ApolloProvider>
  );
}
