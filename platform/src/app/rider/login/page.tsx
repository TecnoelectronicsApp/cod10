'use client';

import { useMutation, ApolloProvider } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { getApolloClient, resetApolloClients } from '@/lib/apollo-client';
import { saveRiderAuth, getToken } from '@/lib/auth';
import { RIDER_LOGIN } from '@/lib/graphql/operations';

function RiderLoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const [login, { loading }] = useMutation(RIDER_LOGIN);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data } = await login({ variables: { username, password } });
      if (data && typeof data === 'object' && 'riderLogin' in data) {
        const r = (data as { riderLogin: { userId: string; token: string } }).riderLogin;
        saveRiderAuth(r.userId, r.token);
        resetApolloClients();
      }
      router.push('/rider');
    } catch {
      setError('Usuario o contraseña incorrectos');
    }
  };

  if (getToken('rider')) {
    router.replace('/rider');
    return null;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-blue-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center text-white">
          <span className="text-5xl">🛵</span>
          <h1 className="mt-2 text-2xl font-bold">App Repartidor</h1>
          <p className="text-blue-300">Gestiona tus entregas</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-blue-900 p-6">
          <input
            required
            placeholder="Usuario"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-blue-700 bg-blue-800 px-3 py-2 text-white"
          />
          <input
            type="password"
            required
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-blue-700 bg-blue-800 px-3 py-2 text-white"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-500 py-2.5 font-semibold text-white hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        <Link href="/" className="mt-4 block text-center text-sm text-blue-400 hover:text-white">
          ← Volver al menú
        </Link>
      </div>
    </div>
  );
}

export default function RiderLoginPage() {
  return (
    <ApolloProvider client={getApolloClient('rider')}>
      <RiderLoginForm />
    </ApolloProvider>
  );
}
