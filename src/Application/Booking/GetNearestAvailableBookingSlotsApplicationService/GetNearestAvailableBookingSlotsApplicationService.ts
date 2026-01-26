import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import { BookingSlotRuleDomainService } from 'Domain/services/Booking/BookingSlotRuleDomainService/BookingSlotRuleDomainService';
import {
  IBookingCalendarEventQuery,
  BookingCalendarEventTimeRange,
} from 'Application/Booking/IBookingCalendarEventQuery';

export type GetNearestAvailableBookingSlotsQuery = {
  /** ISO (YYYY-MM-DDTHH:mm:ss.SSS+09:00) */
  from?: string;
  durationMinutes: number;
  /** default: 5 */
  limit?: number;
  /** default: 30 */
  searchDays?: number;
};

export type AvailableSlot = {
  startAt: string;
  endAt: string;
};

export type GetNearestAvailableBookingSlotsResult = {
  from: string;
  durationMinutes: number;
  slots: AvailableSlot[];
};

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;
const DEFAULT_SEARCH_DAYS = 14;
const MIN_SEARCH_DAYS = 1;
const MAX_SEARCH_DAYS = 90;

/**
 * 直近の予約可能枠を探索する
 *
 * ドメイン制約:
 * - DateTime: canonical ISO (+09:00 + ミリ秒)
 * - TimeRange.startAt: ちょうど00分
 * - Duration: 60分単位
 */
export class GetNearestAvailableBookingSlotsApplicationService {
  constructor(private readonly calendarEventQuery: IBookingCalendarEventQuery) {}

  async execute(query: GetNearestAvailableBookingSlotsQuery): Promise<GetNearestAvailableBookingSlotsResult> {
    if (!Number.isFinite(query.durationMinutes)) throw new Error('durationMinutes は必須です');

    // Domainオブジェクトで validate
    const duration = new Duration(query.durationMinutes);

    const limit = clampInt(query.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT);
    const searchDays = clampInt(query.searchDays ?? DEFAULT_SEARCH_DAYS, MIN_SEARCH_DAYS, MAX_SEARCH_DAYS);

    const rawFrom = query.from ? new DateTime(query.from) : DateTime.now();
    const fromAligned = ceilToNextHour(rawFrom);

    const timeMax = fromAligned.addMinutes(searchDays * 24 * 60);

    // 一括取得（API呼び出しは基本1回）
    const eventRanges = await this.calendarEventQuery.listActiveEventTimeRanges({
      timeMin: fromAligned,
      timeMax,
    });

    // 「同日の既存予約数」は Port の定義に寄せる。
    // NOTE: ここでは候補枠の dayKey ごとに呼び出すと多くなるため、日単位でキャッシュする。
    const bookingCountByDay = new Map<string, number>();

    const slots: AvailableSlot[] = [];

    // 候補は「開始 = 1時間単位」。duration は 60,n*60 OK。
    let cursor = fromAligned;
    while (cursor.isBefore(timeMax) && slots.length < limit) {
      // TimeRange の validate があるので、常に hour-aligned の cursor を渡す
      const candidate = new TimeRange(cursor, duration);

      // 営業時間・開始時刻制約などのビジネスルールを適用
      const dayKey = toJstDayKey(candidate.startAt);
      let existingBookingsCount = bookingCountByDay.get(dayKey);
      if (existingBookingsCount === undefined) {
        existingBookingsCount = await this.calendarEventQuery.countActiveEventsOverlappingBusinessHoursByJstDay({
          jstDayKey: dayKey,
        });
        bookingCountByDay.set(dayKey, existingBookingsCount);
      }

      const canBook = BookingSlotRuleDomainService.canBook(candidate, {
        existingBookingsCount,
      });
      if (!canBook.ok) {
        cursor = cursor.addMinutes(60);
        continue;
      }

      const overlaps = hasOverlapWithBuffer(candidate, eventRanges, 60);
      if (!overlaps) {
        slots.push({ startAt: candidate.startAt.value, endAt: candidate.endAt.value });
      }

      cursor = cursor.addMinutes(60);
    }

    return {
      from: fromAligned.value,
      durationMinutes: duration.minutes,
      slots,
    };
  }
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const v = Math.trunc(value);
  return Math.max(min, Math.min(max, v));
}

function toJstDayKey(dt: DateTime): string {
  const parts = toJstDateParts(dt.toTimestamp());
  const m = String(parts.month).padStart(2, '0');
  const day = String(parts.day).padStart(2, '0');
  return `${parts.year}-${m}-${day}`;
}

function toJstDateParts(timestampMs: number): { year: number; month: number; day: number } {
  const d = new Date(timestampMs + 9 * 60 * 60 * 1000);
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1,
    day: d.getUTCDate(),
  };
}

/**
 * 現在時刻が 10:xx なら 11:00 に切り上げ。
 * ちょうど 10:00 なら 10:00 のまま。
 */
function ceilToNextHour(dt: DateTime): DateTime {
  const t = dt.toTimestamp();
  const hourMs = 60 * 60 * 1000;

  const alreadyAligned = t % hourMs === 0;
  if (alreadyAligned) return dt;

  const ceiled = Math.ceil(t / hourMs) * hourMs;
  return DateTime.fromDate(new Date(ceiled));
}

function hasOverlapWithBuffer(
  slot: TimeRange,
  eventRanges: BookingCalendarEventTimeRange[],
  bufferMinutes: number,
): boolean {
  const slotStart = slot.startAt.addMinutes(-bufferMinutes).toTimestamp();
  const slotEnd = slot.endAt.addMinutes(bufferMinutes).toTimestamp();

  // eventRanges は start昇順が望ましいが、保証しなくてもOK
  return eventRanges.some((r) => r.start < slotEnd && slotStart < r.end);
}
