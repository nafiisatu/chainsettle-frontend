'use client';

import { useEffect } from 'react';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { SessionTimeoutModal } from '@/components/auth/SessionTimeoutModal';
import { defaultLocale, getLocaleDirection } from '@/i18n/config';
import defaultMessages from '@/i18n/messages/en.json';

interface ProvidersProps {
  children: React.ReactNode;
  locale?: string;
  messages?: AbstractIntlMessages;
}

export function Providers({
  children,
  locale = defaultLocale,
  messages = defaultMessages,
}: ProvidersProps) {
  const rehydrate = useAuthStore((s) => s.rehydrate);

  // Rehydrate JWT from localStorage on app start
  useEffect(() => {
    rehydrate();
  }, [rehydrate]);

  // Keep <html lang> and <html dir> synchronized with active locale
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale;
      document.documentElement.dir = getLocaleDirection(locale);
    }
  }, [locale]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      <SessionTimeoutModal />
    </NextIntlClientProvider>
  );
}
