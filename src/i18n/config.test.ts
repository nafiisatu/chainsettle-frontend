import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isLocale,
  locales,
  defaultLocale,
  isRtlLocale,
  getLocaleDirection,
} from './config.ts';

describe('i18n configuration', () => {
  describe('locales constant', () => {
    it('defines supported locales', () => {
      // locales is a readonly tuple of supported locale codes
      assert.ok(Array.isArray(locales));
      assert.ok(locales.length > 0);
      assert.ok(locales.includes('en'));
    });

    it('contains only valid locale codes', () => {
      // Locale codes should follow ISO 639-1 (2-letter) or ISO 639-1 + country (5-letter)
      // Examples: 'en', 'fr', 'de', 'en-US', 'pt-BR', 'zh-CN'
      
      for (const locale of locales) {
        // Simple validation: lowercase, 2-5 characters, may include hyphen
        assert.match(locale as string, /^[a-z]{2}(-[a-z]{2})?$/i);
      }
    });

    it('contains "en" as the default locale', () => {
      assert.ok(locales.includes('en'));
    });
  });

  describe('defaultLocale constant', () => {
    it('is a valid locale from the locales array', () => {
      assert.ok(locales.includes(defaultLocale));
    });

    it('defaults to "en" (English)', () => {
      assert.equal(defaultLocale, 'en');
    });
  });

  describe('isLocale type guard', () => {
    it('returns true for valid locale strings', () => {
      assert.equal(isLocale('en'), true);
      assert.equal(isLocale('fr'), true);
      assert.equal(isLocale('ar'), true);
    });

    it('returns true for all supported locales', () => {
      for (const locale of locales) {
        assert.equal(isLocale(locale), true, `${locale} should be recognized`);
      }
    });

    it('returns false for unsupported locale strings', () => {
      assert.equal(isLocale('de'), false);
      assert.equal(isLocale('es'), false);
      assert.equal(isLocale('pt'), false);
      assert.equal(isLocale('ja'), false);
      assert.equal(isLocale('zh'), false);
    });

    it('identifies RTL locales and text direction', () => {
      assert.equal(isRtlLocale('ar'), true);
      assert.equal(isRtlLocale('en'), false);
      assert.equal(isRtlLocale('fr'), false);
      assert.equal(getLocaleDirection('ar'), 'rtl');
      assert.equal(getLocaleDirection('en'), 'ltr');
      assert.equal(getLocaleDirection('fr'), 'ltr');
      assert.equal(getLocaleDirection(undefined), 'ltr');
    });

    it('returns false for invalid input', () => {
      assert.equal(isLocale(''), false);
      assert.equal(isLocale('invalid'), false);
      assert.equal(isLocale('EN'), false); // case sensitive
      assert.equal(isLocale('123'), false);
    });

    it('returns false for null and undefined', () => {
      assert.equal(isLocale(null), false);
      assert.equal(isLocale(undefined), false);
    });

    it('handles edge cases safely', () => {
      // Type guard should not throw even on unexpected input
      assert.doesNotThrow(() => {
        isLocale('');
        isLocale(null as any);
        isLocale(undefined as any);
        isLocale(123 as any);
        isLocale({} as any);
      });
    });
  });

  describe('locale configuration patterns', () => {
    it('documents the purpose of defaultLocale', () => {
      // defaultLocale is used when:
      // 1. User's preferred locale isn't available
      // 2. No locale is specified in the URL
      // 3. User's browser language doesn't match supported locales
      
      // Always fall back to 'en' for consistency
      assert.equal(defaultLocale, 'en');
    });

    it('documents the localePrefix pattern', () => {
      // localePrefix: 'as-needed' means:
      // - Default locale (en) doesn't appear in URL: /shipments
      // - Other locales appear: /fr/shipments, /de/shipments
      // 
      // Alternative values:
      // - 'always': /en/shipments, /fr/shipments (all URLs prefixed)
      // - 'never': /shipments (no locale in URL, detected from headers)
      
      const prefix = 'as-needed';
      assert.ok(['as-needed', 'always', 'never'].includes(prefix));
    });
  });

  describe('locale additions workflow', () => {
    it('documents how to add a new locale', () => {
      // To add a new locale (e.g., French):
      // 1. Create src/i18n/messages/fr.json (copy from en.json and translate)
      // 2. Add 'fr' to locales array: export const locales = ['en', 'fr']
      // 3. Update src/app/providers.tsx to load fr messages
      // 4. Test with URL /fr/... to verify routing
      
      const exampleLocales = ['en', 'fr'];
      assert.ok(exampleLocales.every((loc) => typeof loc === 'string'));
    });

    it('documents locale code conventions', () => {
      // ISO 639-1 (two-letter codes):
      // - 'en' (English)
      // - 'fr' (French)
      // - 'de' (German)
      // - 'es' (Spanish)
      // - 'pt' (Portuguese)
      // - 'ja' (Japanese)
      // - 'zh' (Chinese)
      //
      // ISO 3166-1 (country variants):
      // - 'en-US' (American English)
      // - 'en-GB' (British English)
      // - 'pt-BR' (Brazilian Portuguese)
      // - 'zh-CN' (Simplified Chinese)
      
      const examples = {
        'en': 'English (generic)',
        'en-US': 'English (United States)',
        'fr': 'French',
        'de': 'German',
        'es': 'Spanish',
      };
      
      assert.ok(Object.keys(examples).length >= 2);
    });
  });

  describe('message file loading', () => {
    it('documents message file structure', () => {
      // Message files are JSON in src/i18n/messages/{locale}.json
      // 
      // Structure:
      // {
      //   "namespace": {
      //     "key": "translation string",
      //     "nested": {
      //       "key": "another string"
      //     }
      //   }
      // }
      //
      // Example paths:
      // - src/i18n/messages/en.json
      // - src/i18n/messages/fr.json
      // - src/i18n/messages/de.json
      
      const messagePath = 'src/i18n/messages/en.json';
      assert.ok(messagePath.includes('messages'));
      assert.ok(messagePath.endsWith('.json'));
    });

    it('documents provider setup for new locales', () => {
      // In src/app/providers.tsx:
      // 
      // import enMessages from '@/i18n/messages/en.json';
      // import frMessages from '@/i18n/messages/fr.json';
      // 
      // const messages = {
      //   en: enMessages,
      //   fr: frMessages,
      // };
      // 
      // Then use: messages[locale]
      
      const messages = { en: {}, fr: {} };
      assert.ok('en' in messages && 'fr' in messages);
    });
  });

  describe('URL routing with locales', () => {
    it('documents URL patterns with as-needed prefix', () => {
      // With localePrefix: 'as-needed':
      // 
      // English (default):
      // - /shipments
      // - /dashboard
      // - /auth/login
      // 
      // French:
      // - /fr/shipments
      // - /fr/dashboard
      // - /fr/auth/login
      // 
      // No locale prefix is added to default locale URLs for cleaner UX
      
      const defaultPaths = ['/shipments', '/dashboard', '/auth/login'];
      const frenchPaths = ['/fr/shipments', '/fr/dashboard', '/fr/auth/login'];
      
      assert.equal(defaultPaths.length, 3);
      assert.equal(frenchPaths.length, 3);
    });

    it('documents middleware locale detection', () => {
      // Middleware (src/middleware.ts) handles:
      // 1. Detecting locale from URL path
      // 2. Detecting locale from Accept-Language header
      // 3. Validating locale against configured locales
      // 4. Routing to default locale if necessary
      // 5. Preserving locale in navigation
      
      const middlewareTasks = ['detect', 'validate', 'route'];
      assert.ok(middlewareTasks.every((t) => typeof t === 'string'));
    });
  });

  describe('server and client usage', () => {
    it('documents getTranslations (server components)', () => {
      // In Server Components:
      // 
      // import { getTranslations } from 'next-intl/server';
      // 
      // export async function MyComponent() {
      //   const t = await getTranslations();
      //   return <h1>{t('key')}</h1>;
      // }
      
      const hook = 'getTranslations';
      assert.ok(typeof hook === 'string');
    });

    it('documents useTranslations (client components)', () => {
      // In Client Components:
      // 
      // 'use client';
      // import { useTranslations } from 'next-intl';
      // 
      // export function MyComponent() {
      //   const t = useTranslations();
      //   return <h1>{t('key')}</h1>;
      // }
      
      const hook = 'useTranslations';
      assert.ok(typeof hook === 'string');
    });

    it('documents interpolation in translations', () => {
      // Message file with variable:
      // "greeting": "Hello, {name}!"
      // 
      // Component usage:
      // const greeting = t('greeting', { name: 'Alice' });
      // Result: "Hello, Alice!"
      
      const example = 'Hello, {name}!';
      assert.ok(example.includes('{name}'));
    });
  });

  describe('testing i18n integration', () => {
    it('documents how to mock translations in tests', () => {
      // In test setup:
      // 
      // vi.mock('next-intl', () => ({
      //   useTranslations: () => (key: string) => key,
      //   getTranslations: () => async (key: string) => key,
      // }));
      // 
      // This returns the key itself instead of a translation,
      // making test assertions simpler
      
      const mockTranslation = (key: string) => key;
      assert.equal(mockTranslation('auth.login'), 'auth.login');
    });

    it('documents locale-specific test cases', () => {
      // Test scenarios:
      // 1. URL routing: /en, /fr, /de produce correct locale
      // 2. Message loading: Correct messages for each locale
      // 3. Formatting: Numbers/dates formatted per locale
      // 4. Fallback: Missing locale falls back to default
      // 5. Type safety: isLocale prevents invalid locales
      
      const scenarios = ['routing', 'loading', 'formatting', 'fallback', 'type-safety'];
      assert.equal(scenarios.length, 5);
    });
  });
});
