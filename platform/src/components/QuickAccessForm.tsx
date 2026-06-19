'use client';

import { useMutation } from '@apollo/client/react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useCallback, useEffect, useState } from 'react';
import { saveCustomerAuth } from '@/lib/auth';
import { CREATE_USER, LOGIN, LOGIN_SOCIAL } from '@/lib/graphql/operations';
import {
  formatPhoneDisplay,
  normalizePhone,
  phoneToCredentials,
} from '@/lib/quick-auth';

type AuthResult = {
  userId: string;
  token: string;
  is_active?: boolean;
};

function GoogleSignInButton({
  onSuccess,
  onError,
  disabled,
}: {
  onSuccess: (email: string, name: string) => void;
  onError: (msg: string) => void;
  disabled?: boolean;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const id = 'google-gsi-script';
    if (document.getElementById(id)) {
      setReady(true);
      return;
    }
    const script = document.createElement('script');
    script.id = id;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, [clientId]);

  useEffect(() => {
    if (!ready || !clientId || disabled) return;

    const google = (window as Window & { google?: { accounts: { id: { initialize: (c: object) => void; renderButton: (el: HTMLElement, c: object) => void } } } }).google;
    if (!google?.accounts?.id) return;

    const container = document.getElementById('google-signin-btn');
    if (!container || container.childElementCount > 0) return;

    google.accounts.id.initialize({
      client_id: clientId,
      callback: (response: { credential?: string }) => {
        if (!response.credential) {
          onError('No se pudo iniciar sesión con Google');
          return;
        }
        try {
          const payload = JSON.parse(atob(response.credential.split('.')[1])) as {
            email?: string;
            name?: string;
          };
          if (!payload.email) {
            onError('Google no devolvió un email');
            return;
          }
          onSuccess(payload.email, payload.name || payload.email.split('@')[0]);
        } catch {
          onError('Error al leer datos de Google');
        }
      },
    });

    google.accounts.id.renderButton(container, {
      theme: 'outline',
      size: 'large',
      width: 320,
      text: 'continue_with',
      locale: 'es',
    });
  }, [ready, clientId, disabled, onError, onSuccess]);

  if (!clientId) return null;

  return (
    <div className="flex flex-col items-center gap-2">
      <div id="google-signin-btn" className="flex min-h-[44px] justify-center" />
    </div>
  );
}

function QuickAccessFormInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') || '/';
  const fromWhatsApp = params.get('from') === 'whatsapp' || !!params.get('phone');

  const [phone, setPhone] = useState('');
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  const [login] = useMutation(LOGIN);
  const [loginSocial] = useMutation(LOGIN_SOCIAL);
  const [createUser] = useMutation(CREATE_USER);

  const finishAuth = useCallback(
    (result: AuthResult | null) => {
      if (!result?.token || !result.userId) {
        setError('No se pudo iniciar sesión');
        return;
      }
      if (result.is_active === false) {
        setError('Cuenta desactivada');
        return;
      }
      saveCustomerAuth(result.userId, result.token);
      router.push(redirect);
    },
    [redirect, router],
  );

  const loginOrRegisterPhone = useCallback(
    async (rawPhone: string) => {
      setError('');
      setLoading(true);
      const normalized = normalizePhone(rawPhone);
      if (normalized.length < 10) {
        setError('Ingresa un número de teléfono válido');
        setLoading(false);
        return;
      }

      const creds = phoneToCredentials(normalized);

      try {
        try {
          const { data } = await login({
            variables: { email: creds.email, password: creds.password, type: 'default' },
          });
          const result =
            data && typeof data === 'object' && 'login' in data
              ? (data as { login: AuthResult }).login
              : null;
          finishAuth(result);
          return;
        } catch {
          /* crear cuenta */
        }

        const { data } = await createUser({ variables: creds });
        const result =
          data && typeof data === 'object' && 'createUser' in data
            ? (data as { createUser: AuthResult }).createUser
            : null;
        if (result) finishAuth({ ...result, is_active: true });
        else setError('No se pudo crear tu cuenta.');
      } catch {
        setError('No se pudo crear tu cuenta. Intenta de nuevo.');
      } finally {
        setLoading(false);
      }
    },
    [createUser, finishAuth, login],
  );

  const handleGoogle = useCallback(
    async (googleEmail: string, name: string) => {
      setError('');
      try {
        const { data } = await loginSocial({
          variables: {
            email: googleEmail,
            password: '',
            name,
            type: 'google',
          },
        });
        const result =
          data && typeof data === 'object' && 'login' in data
            ? (data as { login: AuthResult }).login
            : null;
        finishAuth(result);
      } catch {
        setError('No se pudo entrar con Google');
      }
    },
    [finishAuth, loginSocial],
  );

  useEffect(() => {
    const fromUrl = params.get('phone') || params.get('wa') || params.get('tel');
    if (fromUrl && !phone) {
      setPhone(fromUrl);
    }
  }, [params, phone]);

  useEffect(() => {
    const fromUrl = params.get('phone') || params.get('wa') || params.get('tel');
    const auto = params.get('auto') !== '0';
    if (fromUrl && auto && !autoTried) {
      setAutoTried(true);
      loginOrRegisterPhone(fromUrl);
    }
  }, [autoTried, loginOrRegisterPhone, params]);

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginOrRegisterPhone(phone);
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await login({ variables: { email, password, type: 'default' } });
      const result =
        data && typeof data === 'object' && 'login' in data
          ? (data as { login: AuthResult }).login
          : null;
      finishAuth(result);
    } catch {
      setError('Email o contraseña incorrectos');
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <h1 className="mb-2 text-2xl font-bold">
        {fromWhatsApp ? '¡Hola! Entra en un toque' : 'Entrar o registrarse'}
      </h1>
      <p className="mb-6 text-sm text-gray-500">
        {fromWhatsApp
          ? 'Detectamos tu WhatsApp. Solo confirma tu número — sin contraseñas que recordar.'
          : 'Usa tu teléfono (como en WhatsApp) o Google. Sin formularios largos.'}
      </p>

      {!showEmailForm ? (
        <div className="space-y-4">
          <form onSubmit={handlePhoneSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
            <div>
              <label className="mb-1 block text-sm font-medium">Tu teléfono</label>
              <input
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0412-733-3600"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-lg border px-3 py-3 text-lg"
              />
              {normalizePhone(phone).length >= 10 && (
                <p className="mt-1 text-xs text-gray-400">
                  Entrarás como {formatPhoneDisplay(phone)}
                </p>
              )}
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {loading ? 'Entrando...' : 'Continuar'}
            </button>
            <p className="text-center text-xs text-gray-400">
              Si es tu primera vez, creamos la cuenta automáticamente.
            </p>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-gray-50 px-2 text-gray-400">o</span>
            </div>
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm">
            <GoogleSignInButton onSuccess={handleGoogle} onError={setError} />
            {!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID && (
              <p className="mt-2 text-center text-xs text-gray-400">
                Google disponible cuando configures NEXT_PUBLIC_GOOGLE_CLIENT_ID
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowEmailForm(true)}
            className="w-full text-center text-sm text-gray-500 hover:text-orange-600"
          >
            Prefiero usar email y contraseña
          </button>
          <p className="text-center text-sm text-gray-500">
            Registro clásico:{' '}
            <Link
              href={`/register?mode=email&redirect=${encodeURIComponent(redirect)}`}
              className="text-orange-600 hover:underline"
            >
              con email
            </Link>
          </p>
        </div>
      ) : (
        <form onSubmit={handleEmailSubmit} className="space-y-4 rounded-xl bg-white p-6 shadow-sm">
          <div>
            <label className="mb-1 block text-sm font-medium">Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">Contraseña</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            className="w-full rounded-xl bg-orange-500 py-2.5 font-semibold text-white hover:bg-orange-600"
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setShowEmailForm(false)}
            className="w-full text-sm text-gray-500 hover:text-orange-600"
          >
            ← Volver al acceso rápido
          </button>
          <p className="text-center text-sm text-gray-500">
            ¿Nuevo?{' '}
            <Link href={`/register?redirect=${encodeURIComponent(redirect)}`} className="text-orange-600 hover:underline">
              Registro con email
            </Link>
          </p>
        </form>
      )}
    </div>
  );
}

export default function QuickAccessForm() {
  return (
    <Suspense>
      <QuickAccessFormInner />
    </Suspense>
  );
}
