import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/lib/cart-context';
import Nav from '@/components/Nav';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FoodDelivery — Menú, Cocina y Repartidor',
  description: 'Sistema completo de delivery: menú para clientes, pantalla de cocina y app de repartidor',
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
