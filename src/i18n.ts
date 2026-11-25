import { getRequestConfig } from 'next-intl/server';

export default getRequestConfig(async () => {
  return {
    locale: 'en',
    messages: (await import('./i18n/messages/en.json')).default,
import { cookies } from 'next/headers';
import { locales, defaultLocale, type Locale } from './i18n/config';

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const requested = cookieStore.get('NEXT_LOCALE')?.value;
  const locale: Locale =
    requested && (locales as readonly string[]).includes(requested)
      ? (requested as Locale)
      : defaultLocale;

  return {
    locale,
    messages: (await import(`./i18n/messages/${locale}.json`)).default,
  };
});
