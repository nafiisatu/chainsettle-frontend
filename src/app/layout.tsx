import type { Metadata } from 'next';
import { getLocale, getMessages } from 'next-intl/server';
import { getLocaleDirection } from '@/i18n/config';
import '@/styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: { default: 'ChainSettle', template: '%s | ChainSettle' },
  description: 'Milestone-based supply chain escrow on Stellar Soroban',
  icons: { icon: '/favicon.svg' },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = await getMessages();
  const dir = getLocaleDirection(locale);

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body>
        <a href="#main" className="skip-link">Skip to main content</a>
        <Providers locale={locale} messages={messages}>{children}</Providers>
      </body>
    </html>
  );
}
