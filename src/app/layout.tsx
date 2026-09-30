import type { Metadata } from 'next';
import { Archivo } from 'next/font/google';
import type { ReactNode } from 'react';
import { SiteFooter } from '@/components/site-footer';
import { SiteHeader } from '@/components/site-header';
import { Toaster } from '@/components/ui/sonner';
import { UserMenu } from '@/components/user-menu';
import './globals.css';

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo' });

export const metadata: Metadata = {
  title: { default: 'Streaming Agora', template: '%s · Streaming Agora' },
  description: 'Os filmes disponíveis agora nos streamings do Brasil.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body
        className={`${archivo.variable} flex min-h-screen flex-col bg-background font-sans antialiased`}
      >
        <SiteHeader userSlot={<UserMenu />} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
        <Toaster theme="dark" richColors />
      </body>
    </html>
  );
}
