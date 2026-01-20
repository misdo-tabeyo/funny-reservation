import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import {
  IBookingCalendarEventQuery,
  BookingCalendarEventTimeRange,
} from 'Application/Booking/IBookingCalendarEventQuery';
import { IGoogleCalendarClient } from 'Infrastructure/GoogleCalendar/IGoogleCalendarClient';
import { toGoogleCalendarEventTimestampRange } from './googleCalendarEventTimeRange';

export class GoogleCalendarBookingCalendarEventQuery implements IBookingCalendarEventQuery {
  constructor(
    private readonly client: IGoogleCalendarClient,
    private readonly calendarId: string,
  ) {}

  async listActiveEventTimeRanges(params: {
    timeMin: DateTime;
    timeMax: DateTime;
  }): Promise<BookingCalendarEventTimeRange[]> {
    const events = await this.client.listEvents({
      calendarId: this.calendarId,
      timeMin: params.timeMin.value,
      timeMax: params.timeMax.value,
    });

    const activeEvents = events.filter((e) => e.status !== 'cancelled');

    return activeEvents
      .map((e) => toGoogleCalendarEventTimestampRange(e))
      .filter((r): r is { start: number; end: number } => r !== null);
  }

  async countActiveEventsOverlappingBusinessHoursByJstDay(params: {
    jstDayKey: string;
  }): Promise<number> {
    const { jstDayKey } = params;

    // JST 営業時間窓
    const timeMin = `${jstDayKey}T10:00:00.000+09:00`;
    const timeMax = `${jstDayKey}T18:00:00.000+09:00`;

    // listEvents は「開始が timeMin〜timeMax のイベント」中心のため、
    // 前日から跨るイベントも拾えるように検索窓を少し広げる。
    const searchMin = Date.parse(timeMin) - 24 * 60 * 60 * 1000;
    const searchMax = Date.parse(timeMax);

    const events = await this.client.listEvents({
      calendarId: this.calendarId,
      timeMin: DateTime.fromTimestamp(searchMin).value,
      timeMax: DateTime.fromTimestamp(searchMax).value,
    });

    const activeEvents = events.filter((e) => e.status !== 'cancelled');

    const windowStart = Date.parse(timeMin);
    const windowEnd = Date.parse(timeMax);

    return activeEvents
      .map((e) => toGoogleCalendarEventTimestampRange(e))
      .filter((r): r is { start: number; end: number } => r !== null)
      .filter((r) => r.start < windowEnd && windowStart < r.end).length;
  }
}
