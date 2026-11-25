import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getLocaleDirection,
  isLocale,
  isRtlLocale,
  locales,
} from './config.ts';

describe('RTL and Arabic locale support', () => {
  it('registers Arabic as a supported RTL locale', () => {
    assert.ok(locales.includes('ar'));
    assert.equal(isLocale('ar'), true);
    assert.equal(isRtlLocale('ar'), true);
    assert.equal(getLocaleDirection('ar'), 'rtl');
  });

  it('keeps LTR direction for English, French, and unknown locales', () => {
    assert.equal(isRtlLocale('en'), false);
    assert.equal(isRtlLocale('fr'), false);
    assert.equal(getLocaleDirection('en'), 'ltr');
    assert.equal(getLocaleDirection('fr'), 'ltr');
    assert.equal(getLocaleDirection(undefined), 'ltr');
    assert.equal(getLocaleDirection(null), 'ltr');
  });

  it('provides valid translation files for every configured locale', () => {
    const messagesDir = path.join(process.cwd(), 'src', 'i18n', 'messages');
    const en = JSON.parse(fs.readFileSync(path.join(messagesDir, 'en.json'), 'utf8'));

    for (const locale of locales) {
      const filePath = path.join(messagesDir, `${locale}.json`);
      assert.ok(fs.existsSync(filePath), `Missing messages file for ${locale}`);
      const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const section of Object.keys(en)) {
        assert.ok(section in parsed, `Locale ${locale} missing section "${section}"`);
      }
      assert.ok(parsed.settings?.dateTimePreferences, `Locale ${locale} missing dateTimePreferences`);
      assert.ok(parsed.milestones?.syncing, `Locale ${locale} missing milestones.syncing`);
      assert.ok(parsed.navigation?.counterparties, `Locale ${locale} missing navigation.counterparties`);
    }
  });
});
