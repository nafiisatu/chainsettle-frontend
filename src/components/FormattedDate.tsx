'use client';

import { useLocale } from 'next-intl';
import { useAuthStore } from '@/lib/hooks/use-auth-store';
import { formatDate, formatFullTimestamp, timeAgo } from '@/lib/utils';
import type { DateDisplayMode } from '@/lib/utils/date-preferences';

interface FormattedDateProps {
  date: string | null | undefined;
  /**
   * 'auto' (default) follows the user's relative/absolute preference.
   * 'date' formats the calendar date in the user's preferred timezone.
   * 'relative' / 'absolute' force that specific display style.
   */
  mode?: 'auto' | 'date' | DateDisplayMode;
  includeTime?: boolean;
  className?: string;
  prefix?: string;
}

/**
 * Renders a date/timestamp reactive to user timezone & relative/absolute preferences,
 * always providing the full timestamp with timezone in the hover tooltip.
 */
export function FormattedDate({
  date,
  mode = 'auto',
  includeTime,
  className,
  prefix,
}: FormattedDateProps) {
  const datePreferences = useAuthStore((s) => s.datePreferences);
  const locale = useLocale();
  const value = date ?? null;

  if (!value) {
    return <span className={className}>—</span>;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return <span className={className}>—</span>;
  }

  const options = {
    timezone: datePreferences.timezone,
    locale,
    includeTime,
  };

  const display =
    mode === 'date'
      ? formatDate(value, options)
      : timeAgo(value, {
          ...options,
          displayMode: mode === 'auto' ? datePreferences.displayMode : mode,
        });

  const tooltip = formatFullTimestamp(value, options);

  return (
    <time
      dateTime={parsed.toISOString()}
      title={tooltip}
      className={className}
    >
      {prefix ? `${prefix} ${display}` : display}
    </time>
  );
}
