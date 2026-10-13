const MINUTE_MS = 60_000;

type DateParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

const formatterCache = new Map<string, Intl.DateTimeFormat>();

function getFormatter(timezone: string) {
  const cached = formatterCache.get(timezone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat('en-CA', {
    calendar: 'gregory',
    numberingSystem: 'latn',
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });

  formatterCache.set(timezone, formatter);
  return formatter;
}

function getDateParts(date: Date, timezone: string): DateParts {
  const values = Object.fromEntries(
    getFormatter(timezone)
      .formatToParts(date)
      .filter(({ type }) => type !== 'literal')
      .map(({ type, value }) => [type, Number(value)]),
  ) as Record<keyof DateParts, number>;

  return {
    year: values.year,
    month: values.month,
    day: values.day,
    hour: values.hour,
    minute: values.minute,
    second: values.second,
  };
}

function getTimezoneOffsetMs(date: Date, timezone: string) {
  const parts = getDateParts(date, timezone);
  const representedAsUtc = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
  );

  return representedAsUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function parseLocalDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day, date };
}

export function getIsoWeekday(date: Date) {
  return date.getUTCDay() || 7;
}

export function formatLocalDate(date: Date, timezone: string) {
  const parts = getDateParts(date, timezone);
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

export function localMinuteToUtc(
  date: Pick<DateParts, 'year' | 'month' | 'day'>,
  minuteOfDay: number,
  timezone: string,
) {
  const dayOffset = Math.floor(minuteOfDay / (24 * 60));
  const normalizedMinute = minuteOfDay % (24 * 60);
  const wallClockUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day + dayOffset,
    Math.floor(normalizedMinute / 60),
    normalizedMinute % 60,
  );

  let instant = wallClockUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const offset = getTimezoneOffsetMs(new Date(instant), timezone);
    const adjusted = wallClockUtc - offset;
    if (adjusted === instant) break;
    instant = adjusted;
  }

  return new Date(instant);
}

export function formatZonedIso(date: Date, timezone: string) {
  const parts = getDateParts(date, timezone);
  const offsetMinutes = Math.round(
    getTimezoneOffsetMs(date, timezone) / MINUTE_MS,
  );
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const absoluteOffset = Math.abs(offsetMinutes);
  const offsetHours = String(Math.floor(absoluteOffset / 60)).padStart(2, '0');
  const offsetRemainder = String(absoluteOffset % 60).padStart(2, '0');
  const pad = (value: number) => String(value).padStart(2, '0');

  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${pad(parts.hour)}:${pad(parts.minute)}:${pad(parts.second)}${sign}${offsetHours}:${offsetRemainder}`;
}
