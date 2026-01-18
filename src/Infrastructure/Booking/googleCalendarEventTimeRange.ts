import { CalendarEvent } from 'Infrastructure/GoogleCalendar/IGoogleCalendarClient';

/**
 * Google Calendar の CalendarEvent を timestamp range に変換する。
 *
 * - dateTime(+09:00 等) / date(終日) の両方に対応
 * - Domain の DateTime は厳格なため、Infrastructure では Date.parse() を利用して timestamp に落とす
 */
export function toGoogleCalendarEventTimestampRange(
  event: CalendarEvent,
): { start: number; end: number } | null {
  const startIso = event.start?.dateTime ?? allDayStartToDateTime(event.start?.date);
  const endIso = event.end?.dateTime ?? allDayEndToDateTime(event.end?.date);

  if (!startIso || !endIso) return null;

  const start = Date.parse(startIso);
  const end = Date.parse(endIso);

  if (Number.isNaN(start) || Number.isNaN(end)) {
    throw new Error('不正なDateTimeの形式です');
  }

  return { start, end };
}

function allDayStartToDateTime(date?: string): string | null {
  if (!date) return null;
  return `${date}T00:00:00.000Z`;
}

function allDayEndToDateTime(date?: string): string | null {
  if (!date) return null;
  return `${date}T00:00:00.000Z`;
}
