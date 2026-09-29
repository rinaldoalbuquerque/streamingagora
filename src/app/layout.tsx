import type { Metadata } from 'next';
import { Geist } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Toaster } from '@/components/ui/sonner';
import './globals.css';

const geist = Geist({ subsets: ['latin'], variable: '--font-geist-sans' });

export const metadata: Metadata = {
  title: { default: 'Streaming Agora', template: '%s · Streaming Agora' },
  description: 'Os filmes disponíveis agora nos streamings do Brasil.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${geist.variable} flex min-h-screen flex-col font-sans antialiased`}>
        <SiteHeader />
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">{children}</main>
        <SiteFooter />
        <Toaster richColors />
      </body>
    </html>
  );
}
