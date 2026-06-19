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
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/">
          <BrandLogo size={44} tagline="comida rapida de verdad" />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                pathname === l.href
                  ? 'bg-orange-100 text-orange-700'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {l.icon} {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="hidden text-sm text-gray-600 hover:text-orange-600 sm:block"
          >
            Cuenta
          </Link>
          <Link
            href="/cart"
            className="relative flex items-center gap-1 rounded-full bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-orange-600"
          >
            🛒 Carrito
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
