export type DateDisplayMode = 'relative' | 'absolute';

export interface DatePreferences {
  /** 'auto' uses the browser timezone, or any valid IANA timezone like 'UTC', 'America/New_York' */
  timezone: string;
  displayMode: DateDisplayMode;
}

export interface DateFormatOptions {
  timezone?: string;
  displayMode?: DateDisplayMode;
  includeTime?: boolean;
  locale?: string;
}

export const defaultDatePreferences: DatePreferences = {
  timezone: 'auto',
  displayMode: 'relative',
};

export const DATE_PREFERENCES_STORAGE_KEY = 'chainsetttle_date_preferences';

export const COMMON_TIMEZONES: readonly string[] = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Sao_Paulo',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Africa/Lagos',
  'Africa/Cairo',
  'Asia/Dubai',
  'Asia/Riyadh',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney',
];

export function getBrowserTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
}

export function getSupportedTimeZones(): string[] {
  const browserTz = getBrowserTimeZone();
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const supported = Intl.supportedValuesOf('timeZone');
      if (supported.length > 0) {
        return supported.includes(browserTz) ? supported : [browserTz, ...supported];
      }
    }
  } catch {
    /* fallback to curated list */
  }
  return COMMON_TIMEZONES.includes(browserTz)
    ? [...COMMON_TIMEZONES]
    : [browserTz, ...COMMON_TIMEZONES];
}

export function isValidTimeZone(tz: string): boolean {
  if (!tz || tz === 'auto') return true;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function resolveTimeZone(timezone?: string): string {
  if (!timezone || timezone === 'auto') {
    return getBrowserTimeZone();
  }
  return isValidTimeZone(timezone) ? timezone : getBrowserTimeZone();
}

function getStorageKey(address?: string | null): string {
  return address
    ? `${DATE_PREFERENCES_STORAGE_KEY}_${address}`
    : DATE_PREFERENCES_STORAGE_KEY;
}

export function readStoredDatePreferences(address?: string | null): DatePreferences {
  if (typeof window === 'undefined') return defaultDatePreferences;
  try {
    const activeAddress = address ?? window.localStorage.getItem('chainsetttle_address');
    const raw =
      (activeAddress ? window.localStorage.getItem(getStorageKey(activeAddress)) : null) ??
      window.localStorage.getItem(DATE_PREFERENCES_STORAGE_KEY);
    if (!raw) return defaultDatePreferences;
    const parsed = JSON.parse(raw) as Partial<DatePreferences>;
    return {
      timezone:
        typeof parsed.timezone === 'string' && isValidTimeZone(parsed.timezone)
          ? parsed.timezone
          : defaultDatePreferences.timezone,
      displayMode:
        parsed.displayMode === 'absolute' || parsed.displayMode === 'relative'
          ? parsed.displayMode
          : defaultDatePreferences.displayMode,
    };
  } catch {
    return defaultDatePreferences;
  }
}

export function writeStoredDatePreferences(
  preferences: DatePreferences,
  address?: string | null,
): void {
  if (typeof window === 'undefined') return;
  try {
    const payload = JSON.stringify(preferences);
    window.localStorage.setItem(DATE_PREFERENCES_STORAGE_KEY, payload);
    if (address) {
      window.localStorage.setItem(getStorageKey(address), payload);
    }
  } catch {
    /* ignore storage errors */
  }
}

function parseValidDate(date: string | null | undefined): Date | null {
  if (!date) return null;
  const parsed = new Date(date);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Format a date string using active or supplied timezone preference */
export function formatDateWithPreferences(
  date: string | null,
  options?: DateFormatOptions,
): string {
  const parsed = parseValidDate(date);
  if (!parsed) return '—';

  const prefs = readStoredDatePreferences();
  const timeZone = resolveTimeZone(options?.timezone ?? prefs.timezone);
  const locale = options?.locale ?? 'en-US';

  const formatOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone,
  };

  if (options?.includeTime) {
    formatOptions.hour = '2-digit';
    formatOptions.minute = '2-digit';
  }

  return new Intl.DateTimeFormat(locale, formatOptions).format(parsed);
}

/** Format a full timestamp including seconds and timezone abbreviation/offset for tooltips */
export function formatFullTimestamp(
  date: string | null,
  options?: Pick<DateFormatOptions, 'timezone' | 'locale'>,
): string {
  const parsed = parseValidDate(date);
  if (!parsed) return '—';

  const prefs = readStoredDatePreferences();
  const timeZone = resolveTimeZone(options?.timezone ?? prefs.timezone);
  const locale = options?.locale ?? 'en-US';

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZone,
    timeZoneName: 'short',
  }).format(parsed);
}

/** Format relative distance to now using Intl.RelativeTimeFormat */
function formatRelativeToNow(parsed: Date, locale: string): string {
  const diffSeconds = Math.round((parsed.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(diffSeconds);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (absSeconds < 60) {
    return rtf.format(diffSeconds, 'second');
  }
  const diffMinutes = Math.round(diffSeconds / 60);
  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }
  const diffHours = Math.round(diffSeconds / 3600);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }
  const diffDays = Math.round(diffSeconds / 86400);
  if (Math.abs(diffDays) < 30) {
    return rtf.format(diffDays, 'day');
  }
  const diffMonths = Math.round(diffSeconds / (86400 * 30));
  if (Math.abs(diffMonths) < 12) {
    return rtf.format(diffMonths, 'month');
  }
  const diffYears = Math.round(diffSeconds / (86400 * 365));
  return rtf.format(diffYears, 'year');
}

/** Format a date as "X ago" or absolute timestamp depending on user preference */
export function timeAgoWithPreferences(
  date: string | null,
  options?: DateFormatOptions,
): string {
  const parsed = parseValidDate(date);
  if (!parsed) return '—';

  const prefs = readStoredDatePreferences();
  const displayMode = options?.displayMode ?? prefs.displayMode;
  const locale = options?.locale ?? 'en-US';
  if (displayMode === 'absolute') {
    return formatDateWithPreferences(date, {
      timezone: options?.timezone ?? prefs.timezone,
      includeTime: options?.includeTime ?? true,
      locale,
    });
  }

  return formatRelativeToNow(parsed, locale);
}
