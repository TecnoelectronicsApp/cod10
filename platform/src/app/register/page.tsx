'use client';

import { useMutation, ApolloProvider } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { getApolloClient } from '@/lib/apollo-client';
import { saveCustomerAuth } from '@/lib/auth';
import { CREATE_USER } from '@/lib/graphql/operations';
import QuickAccessForm from '@/components/QuickAccessForm';

function EmailRegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/';
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [createUser, { loading }] = useMutation(CREATE_USER);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await createUser({ variables: form });
      const result =
        data && typeof data === 'object' && 'createUser' in data
          ? (data as { createUser: { userId: string; token: string } }).createUser
          : null;
      if (!result) throw new Error('fail');
      saveCustomerAuth(result.userId, result.token);
      router.push(redirect);
    } catch {
      setError('No se pudo crear la cuenta. El email puede estar en uso.');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-6 text-2xl font-bold">Registro con email</h1>
      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
        {(['name', 'email', 'phone', 'password'] as const).map((field) => (
          <div key={field}>
            <label className="mb-1 block text-sm font-medium capitalize">
              {field === 'name'
                ? 'Nombre'
                : field === 'phone'
                  ? 'Teléfono'
                  : field === 'password'
                    ? 'Contraseña'
                    : 'Email'}
            </label>
            <input
              type={field === 'password' ? 'password' : field === 'email' ? 'email' : 'text'}
              required
              value={form[field]}
              onChange={(e) => setForm({ ...form, [field]: e.target.value })}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
        ))}
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
        >
          {loading ? 'Creando...' : 'Registrarse'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-gray-500">
        <Link href={`/login?redirect=${encodeURIComponent(redirect)}`} className="text-orange-600 hover:underline">
          ← Acceso rápido con teléfono
        </Link>
      </p>
    </div>
  );
}

function RegisterPageContent() {
  const params = useSearchParams();
  if (params.get('mode') === 'email') {
    return <EmailRegisterForm />;
  }
  return <QuickAccessForm />;
}

export default function RegisterPage() {
  return (
    <ApolloProvider client={getApolloClient('customer')}>
      <Suspense>
        <RegisterPageContent />
      </Suspense>
    </ApolloProvider>
  );
}
