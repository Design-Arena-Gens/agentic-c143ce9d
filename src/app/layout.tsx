import * as React from 'react';
import { Inter } from 'next/font/google';
import ClientProviders from '@/components/ClientProviders';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Agentic Stocks',
  description: 'Stock prediction and demo trading app'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <body>
        <ClientProviders>{children}</ClientProviders>
      </body>
    </html>
  );
}
