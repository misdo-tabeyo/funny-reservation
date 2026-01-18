import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import {
  IBookingCalendarEventQuery,
  BookingCalendarEventTimeRange,
} from 'Application/Booking/IBookingCalendarEventQuery';

export type GetNearestAvailableBookingSlotsQuery = {
  /** ISO (YYYY-MM-DDTHH:mm:ss.SSSZ) */
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
 * - DateTime: canonical ISO (Z + ミリ秒)
 * - TimeRange.startAt: ちょうど00分
 * - Duration: 60分単位
 */
export class GetNearestAvailableBookingSlotsApplicationService {
  constructor(private readonly calendarEventQuery: IBookingCalendarEventQuery) {}

  async execute(query: GetNearestAvailableBookingSlotsQuery): Promise<GetNearestAvailableBookingSlotsResult> {
    if (!Number.isFinite(query.durationMinutes)) throw new Error('durationMinutes is required');

    // validate via Domain objects
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

    const slots: AvailableSlot[] = [];

    // 候補は「開始 = 1時間単位」。duration は 60,n*60 OK。
    let cursor = fromAligned;
    while (cursor.isBefore(timeMax) && slots.length < limit) {
      // TimeRange の validate があるので、常に hour-aligned の cursor を渡す
      const candidate = new TimeRange(cursor, duration);

      const overlaps = hasOverlap(candidate, eventRanges);
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

function hasOverlap(slot: TimeRange, eventRanges: BookingCalendarEventTimeRange[]): boolean {
  const slotStart = slot.startAt.toTimestamp();
  const slotEnd = slot.endAt.toTimestamp();

  // eventRanges は start昇順が望ましいが、保証しなくてもOK
  return eventRanges.some((r) => r.start < slotEnd && slotStart < r.end);
}
