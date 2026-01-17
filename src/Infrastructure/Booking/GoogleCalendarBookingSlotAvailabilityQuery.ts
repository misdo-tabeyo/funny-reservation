import { CarId } from 'Domain/models/Booking/CarId/CarId';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import { IBookingSlotAvailabilityQuery } from 'Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService';
import {
  IGoogleCalendarClient,
  CalendarEvent,
} from 'Infrastructure/GoogleCalendar/IGoogleCalendarClient';
import { DateTime } from 'Domain/models/shared/DateTime/DateTime';

export class GoogleCalendarBookingSlotAvailabilityQuery implements IBookingSlotAvailabilityQuery {
  constructor(
    private readonly client: IGoogleCalendarClient,
    private readonly calendarId: string,
  ) {}

  async existsOverlappingSlot(params: { carId: CarId; timeRange: TimeRange }): Promise<boolean> {
    const { carId, timeRange } = params;

    // 現状 carId を「カレンダーの絞り込み」に使っていないので unused 回避
    // （後で「車=別カレンダー」や「event拡張プロパティでcarId」などにすると活きる）
    void carId;

    // Google Calendar の list は「開始が timeMin〜timeMax のイベント」中心になりがちなので、
    // 「開始が前にあっても被っているイベント」を拾うために検索窓を少し広げる。
    // まずは運用上安全な値として -24h を採用（必要なら後で最適化）
    const windowStart = this.minusHours(timeRange.startAt, 24).value;
    const windowEnd = timeRange.endAt.value;

    const events = await this.client.listEvents({
      calendarId: this.calendarId,
      timeMin: windowStart,
      timeMax: windowEnd,
    });

    // cancelled は無視
    const activeEvents = events.filter((e) => e.status !== 'cancelled');

    // 1件でも重なっていれば「埋まっている」
    return activeEvents.some((event) => this.overlapsEvent(timeRange, event));
  }

  /**
   * TimeRange は「開始=00分」制約があるため、
   * Googleイベント（15分開始など）を TimeRange に変換して比較するのは危険。
   * -> timestamp で区間重なり判定する。
   */
  private overlapsEvent(slot: TimeRange, event: CalendarEvent): boolean {
    const startIso = event.start?.dateTime ?? this.allDayStartToDateTime(event.start?.date);
    const endIso = event.end?.dateTime ?? this.allDayEndToDateTime(event.end?.date);
    if (!startIso || !endIso) return false;

    const evStart = new DateTime(startIso).toTimestamp();
    const evEnd = new DateTime(endIso).toTimestamp();

    const slotStart = slot.startAt.toTimestamp();
    const slotEnd = slot.endAt.toTimestamp();

    // [start, end) の重なり
    return evStart < slotEnd && slotStart < evEnd;
  }

  private allDayStartToDateTime(date?: string): string | null {
    // all-day event: start.date="2026-01-04"
    // -> 00:00:00Z とみなす（TZ運用が必要ならここを調整）
    if (!date) return null;
    return `${date}T00:00:00.000Z`;
  }

  private allDayEndToDateTime(date?: string): string | null {
    // end.date は「翌日」になっていることが多い
    if (!date) return null;
    return `${date}T00:00:00.000Z`;
  }

  private minusHours(dt: DateTime, hours: number): DateTime {
    return dt.addMinutes(-hours * 60);
  }
}
