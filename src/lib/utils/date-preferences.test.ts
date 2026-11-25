import { describe, it, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  DATE_PREFERENCES_STORAGE_KEY,
  defaultDatePreferences,
  formatDateWithPreferences,
  formatFullTimestamp,
  isValidTimeZone,
  readStoredDatePreferences,
  resolveTimeZone,
  timeAgoWithPreferences,
  writeStoredDatePreferences,
} from './date-preferences.ts';

describe('Date preferences and timezone-aware formatting', () => {
  const originalWindow = (globalThis as any).window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete (globalThis as any).window;
    } else {
      (globalThis as any).window = originalWindow;
    }
  });

  it('validates IANA timezones and resolves auto safely', () => {
    assert.equal(isValidTimeZone('auto'), true);
    assert.equal(isValidTimeZone('UTC'), true);
    assert.equal(isValidTimeZone('America/New_York'), true);
    assert.equal(isValidTimeZone('Invalid/Zone_Name'), false);

    assert.equal(resolveTimeZone('UTC'), 'UTC');
    assert.ok(resolveTimeZone('auto').length > 0);
  });

  it('formats dates according to the chosen timezone', () => {
    // 2026-06-15T02:30:00.000Z is Jun 15 in UTC, but Jun 14 in America/Los_Angeles (UTC-7)
    const iso = '2026-06-15T02:30:00.000Z';
    const utcFormatted = formatDateWithPreferences(iso, { timezone: 'UTC', locale: 'en-US' });
    const laFormatted = formatDateWithPreferences(iso, {
      timezone: 'America/Los_Angeles',
      locale: 'en-US',
    });

    assert.equal(utcFormatted, 'Jun 15, 2026');
    assert.equal(laFormatted, 'Jun 14, 2026');
    assert.equal(formatDateWithPreferences(null), '—');
    assert.equal(formatDateWithPreferences('not-a-date'), '—');
  });

  it('supports relative and absolute display modes in timeAgoWithPreferences', () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const rel = timeAgoWithPreferences(recent, { displayMode: 'relative' });
    assert.ok(rel.includes('ago'));

    const fixed = '2026-06-15T14:05:00.000Z';
    const abs = timeAgoWithPreferences(fixed, {
      displayMode: 'absolute',
      timezone: 'UTC',
      locale: 'en-US',
    });
    assert.ok(abs.includes('Jun 15, 2026'));
    assert.ok(abs.includes('02:05'));
  });

  it('formats full timestamp with timezone for tooltips', () => {
    const iso = '2026-06-15T14:05:30.000Z';
    const tooltip = formatFullTimestamp(iso, { timezone: 'UTC', locale: 'en-US' });
    assert.ok(tooltip.includes('Jun 15, 2026'));
    assert.ok(tooltip.includes('30'));
    assert.ok(tooltip.includes('UTC'));
  });

  it('persists and reads stored preferences from localStorage', () => {
    const store = new Map<string, string>();
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => store.get(k) ?? null,
        setItem: (k: string, v: string) => store.set(k, v),
      },
    };

    assert.deepEqual(readStoredDatePreferences('GABC'), defaultDatePreferences);

    const custom = { timezone: 'Asia/Dubai', displayMode: 'absolute' as const };
    writeStoredDatePreferences(custom, 'GABC');
    assert.ok(store.has(`${DATE_PREFERENCES_STORAGE_KEY}_GABC`));
    assert.deepEqual(readStoredDatePreferences('GABC'), custom);
  });
});
