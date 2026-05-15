/** Default BCP 47 locale for formatted dates (MVP: English; pass i18n.language from UI when needed). */
export const DEFAULT_DATE_LOCALE = 'en';

export const isToday = (date: Date): boolean => {
  const today = new Date();
  return (
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear()
  );
};

export const isYesterday = (date: Date): boolean => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return isEqualDate(date, yesterday);
};

export const isEqualDate = (date1: Date, date2: Date): boolean =>
  date1.getDate() === date2.getDate() &&
  date1.getMonth() === date2.getMonth() &&
  date1.getFullYear() === date2.getFullYear();

export const isValidDateString = (date: string): boolean => !Number.isNaN(new Date(date).getTime());

export type DateFormat = 'short' | 'long' | 'dayMonthYear' | 'year' | 'day' | 'fullWithTime';

export const dateFormats = {
  /** Example: "Jan 15, 2024" */
  short: {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  } as const,
  /** Example: "January 15, 2024" */
  long: {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  } as const,
  /** Example: "15 Jan 2024" */
  dayMonthYear: {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  } as const,
  /** Example: "2024" */
  year: {
    year: 'numeric',
  } as const,
  /** Example: "15" */
  day: {
    day: 'numeric',
  } as const,
  /** Example: "Jan 15, 2024, 02:30 PM" */
  fullWithTime: {
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  } as const,
};

export type FormatDateOptions = {
  locale?: string;
};

export const formatDate = (
  date: string,
  format: DateFormat,
  options?: FormatDateOptions,
): string => {
  if (!isValidDateString(date)) return date;

  const locale = options?.locale ?? DEFAULT_DATE_LOCALE;
  const dateObj = new Date(date);
  const formatOptions = dateFormats[format];

  if (format === 'fullWithTime') {
    return dateObj.toLocaleString(locale, formatOptions);
  }

  return dateObj.toLocaleDateString(locale, formatOptions);
};

const MS_SEC = 1000;
const MS_MIN = 60 * MS_SEC;
const MS_HOUR = 60 * MS_MIN;
const MS_DAY = 24 * MS_HOUR;

const rtfByLocale = new Map<string, Intl.RelativeTimeFormat | null>();

/** Hermes / some RN builds lack Intl.RelativeTimeFormat; lazy-init per locale. */
function getRelativeTimeFormat(locale: string): Intl.RelativeTimeFormat | null {
  if (rtfByLocale.has(locale)) return rtfByLocale.get(locale) ?? null;
  try {
    const Ctor = Intl.RelativeTimeFormat;
    if (typeof Ctor !== 'function') {
      rtfByLocale.set(locale, null);
      return null;
    }
    const formatter = new Ctor(locale, { style: 'short', numeric: 'auto' });
    rtfByLocale.set(locale, formatter);
    return formatter;
  } catch {
    rtfByLocale.set(locale, null);
    return null;
  }
}

function formatRelativeUnit(
  value: number,
  unit: Intl.RelativeTimeFormatUnit,
  locale: string,
): string {
  const formatter = getRelativeTimeFormat(locale);
  if (formatter) return formatter.format(-value, unit);
  switch (unit) {
    case 'second':
      return value === 1 ? '1 sec. ago' : `${value} sec. ago`;
    case 'minute':
      return value === 1 ? '1 min. ago' : `${value} min. ago`;
    case 'hour':
      return value === 1 ? '1 hr. ago' : `${value} hr. ago`;
    case 'day':
      return value === 1 ? '1 day ago' : `${value} days ago`;
    default:
      return `${value} ${unit}s ago`;
  }
}

export type FormatRelativeTimeOptions = {
  fallbackFormat?: DateFormat;
  locale?: string;
};

export const formatRelativeTime = (
  date: string,
  options?: DateFormat | FormatRelativeTimeOptions,
): string => {
  const resolved: FormatRelativeTimeOptions =
    typeof options === 'string' ? { fallbackFormat: options } : (options ?? {});

  if (!isValidDateString(date)) return '—';

  const locale = resolved.locale ?? DEFAULT_DATE_LOCALE;
  const fallbackFormat = resolved.fallbackFormat ?? 'short';
  const dateObj = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();

  if (diffMs < 0) return formatDate(date, fallbackFormat, { locale });
  if (diffMs < MS_SEC) return 'Just now';

  const sec = Math.floor(diffMs / MS_SEC);
  if (sec < 60) return formatRelativeUnit(sec, 'second', locale);

  const min = Math.floor(diffMs / MS_MIN);
  if (min < 60) return formatRelativeUnit(min, 'minute', locale);

  const hour = Math.floor(diffMs / MS_HOUR);
  if (hour < 24 && isToday(dateObj)) return formatRelativeUnit(hour, 'hour', locale);

  const day = Math.floor(diffMs / MS_DAY);
  if (day <= 31) return formatRelativeUnit(day, 'day', locale);

  return formatDate(date, fallbackFormat, { locale });
};
