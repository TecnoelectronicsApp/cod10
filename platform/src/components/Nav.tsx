'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useCart } from '@/lib/cart-context';
import BrandLogo from '@/components/BrandLogo';

const links = [
  { href: '/', label: 'Menú', icon: '🍽️' },
  { href: '/orders', label: 'Mis pedidos', icon: '📦' },
];

export default function Nav() {
  const pathname = usePathname();
  const { count } = useCart();
  const isKitchen = pathname.startsWith('/kitchen');
  const isRider = pathname.startsWith('/rider');

  if (isKitchen || isRider) return null;

  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-3 sm:px-4">
        <Link href="/" className="min-w-0 shrink-0">
          <BrandLogo
            size={40}
            showText
            tagline=""
            className="gap-2 md:hidden"
            textClassName="text-base leading-none"
          />
          <BrandLogo size={80} tagline="" className="hidden md:flex" />
        </Link>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1 md:gap-3">
          <nav className="flex items-center gap-0.5 sm:gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-label={l.label}
              title={l.label}
              className={`rounded-lg px-2 py-2 text-sm font-medium transition sm:px-3 ${
                pathname === l.href
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <span className="sm:hidden">{l.icon}</span>
              <span className="hidden sm:inline">
                {l.icon} {l.label}
              </span>
            </Link>
          ))}
          </nav>

          <Link
            href="/login"
            aria-label="Cuenta"
            title="Cuenta"
            className="rounded-lg px-2 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-orange-600 sm:px-3"
          >
            <span className="sm:hidden">👤</span>
            <span className="hidden sm:inline">Cuenta</span>
          </Link>
          <Link
            href="/cart"
            aria-label="Carrito"
            className="relative flex items-center gap-1 rounded-full bg-orange-500 px-3 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600 sm:px-4"
          >
            <span>🛒</span>
            <span className="hidden min-[380px]:inline">Carrito</span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
