export const locales = ['en', 'fr', 'ar'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'en';

export const localeLabels: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  ar: 'العربية',
};

export const rtlLocales: readonly Locale[] = ['ar'];

export const LOCALE_COOKIE = 'NEXT_LOCALE';

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value);
}

export function isRtlLocale(locale: string | undefined | null): boolean {
  return !!locale && (rtlLocales as readonly string[]).includes(locale);
}

export function getLocaleDirection(locale: string | undefined | null): 'ltr' | 'rtl' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}
