import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import Nav from '@/components/Nav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Codigo 10 — comida rapida de verdad',
  description: 'Codigo 10 — comida rapida de verdad. Pide online y recibe en casa.',
  icons: { icon: '/codigo10.png' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${inter.className} min-h-screen bg-gray-50`}>
        <CartProvider>
          <Nav />
          <main>{children}</main>
        </CartProvider>
      </body>
    </html>
  );
}
