import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import {
  IBookingSlotAvailabilityQuery,
} from 'Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService';
import { IGoogleCalendarClient, CalendarEvent } from 'Infrastructure/GoogleCalendar/IGoogleCalendarClient';
import { DateTime } from 'Domain/models/shared/DateTime/DateTime';

export class GoogleCalendarBookingSlotAvailabilityQuery implements IBookingSlotAvailabilityQuery {
  constructor(
    private readonly client: IGoogleCalendarClient,
    private readonly calendarId: string,
  ) {}

  async existsOverlappingSlot(params: { timeRange: TimeRange }): Promise<boolean> {
    const { timeRange } = params;

    // listEvents は「開始が timeMin〜timeMax のイベント」中心なので、検索窓を少し広げる
    const windowStart = this.minusHours(timeRange.startAt, 24).value;
    const windowEnd = timeRange.endAt.value;

    const events = await this.client.listEvents({
      calendarId: this.calendarId,
      timeMin: windowStart,
      timeMax: windowEnd,
    });

    // cancelled は無視
    const activeEvents = events.filter((e) => e.status !== 'cancelled');

    return activeEvents.some((event) => this.overlapsEvent(timeRange, event));
  }

  private overlapsEvent(slot: TimeRange, event: CalendarEvent): boolean {
    const evRange = this.toEventTimestampRange(event);
    if (!evRange) return false;

    const slotStart = slot.startAt.toTimestamp();
    const slotEnd = slot.endAt.toTimestamp();

    // [start, end) の重なり
    return evRange.start < slotEnd && slotStart < evRange.end;
  }

  /**
   * Google Calendar の日時は RFC3339（+09:00 などオフセット付き）で返ることがある。
   * Domain の DateTime は厳格な制約があるため、Infrastructure では Date.parse() で timestamp に落として扱う。
   */
  private toEventTimestampRange(
    event: CalendarEvent,
  ): { start: number; end: number } | null {
    const startIso =
      event.start?.dateTime ?? this.allDayStartToDateTime(event.start?.date);
    const endIso =
      event.end?.dateTime ?? this.allDayEndToDateTime(event.end?.date);

    if (!startIso || !endIso) return null;

    const start = Date.parse(startIso);
    const end = Date.parse(endIso);

    if (Number.isNaN(start) || Number.isNaN(end)) {
      // ここは「外部I/Fの想定外」なので、ドメインエラーに寄せたメッセージで落とす
      throw new Error('不正なDateTimeの形式です');
    }

    return { start, end };
  }

  private allDayStartToDateTime(date?: string): string | null {
    if (!date) return null;
    return `${date}T00:00:00.000Z`;
  }

  private allDayEndToDateTime(date?: string): string | null {
    if (!date) return null;
    return `${date}T00:00:00.000Z`;
  }

  private minusHours(dt: DateTime, hours: number): DateTime {
    return dt.addMinutes(-hours * 60);
  }
}
