import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import { BookingSlotRuleDomainService } from 'Domain/services/Booking/BookingSlotRuleDomainService/BookingSlotRuleDomainService';
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

    // 「同日の既存予約数（=イベント数）」を日付単位で数えておく
  // NOTE: 予約の正は Google Calendar とする。
  //       よって「同日の既存予約数」=「その日の営業時間帯と重なるイベント数」として数える。
  const bookingCountByDay = countEventsByBusinessDay(eventRanges);

    const slots: AvailableSlot[] = [];

    // 候補は「開始 = 1時間単位」。duration は 60,n*60 OK。
    let cursor = fromAligned;
    while (cursor.isBefore(timeMax) && slots.length < limit) {
      // TimeRange の validate があるので、常に hour-aligned の cursor を渡す
      const candidate = new TimeRange(cursor, duration);

      // 営業時間・開始時刻制約などのビジネスルールを適用
      const dayKey = toUtcDayKey(candidate.startAt);
      const existingBookingsCount = bookingCountByDay.get(dayKey) ?? 0;

      const canBook = BookingSlotRuleDomainService.canBook(candidate, {
        existingBookingsCount,
      });
      if (!canBook.ok) {
        cursor = cursor.addMinutes(60);
        continue;
      }

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

function toUtcDayKey(dt: DateTime): string {
  const d = dt.toDate();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function countEventsByBusinessDay(eventRanges: BookingCalendarEventTimeRange[]): Map<string, number> {
  const map = new Map<string, number>();

  // 「候補が出うる日」だけ数えれば十分だが、ここでは eventRanges から日付集合を作り重なりを数える。
  // IMPORTANT: 終日予定や前日から跨る予定があるため、「開始日で数える」は誤りになり得る。
  const dayKeys = new Set<string>();
  for (const r of eventRanges) {
    // start日とend日（endは非包含の想定）を最低限押さえる
    dayKeys.add(toUtcDayKey(DateTime.fromDate(new Date(r.start))));
    dayKeys.add(toUtcDayKey(DateTime.fromDate(new Date(Math.max(r.end - 1, r.start)))));
  }

  for (const dayKey of dayKeys) {
    const { windowStartMs, windowEndMs } = businessHoursWindowUtcMs(dayKey);
    const count = eventRanges.filter((r) => r.start < windowEndMs && windowStartMs < r.end).length;
    map.set(dayKey, count);
  }

  return map;
}

function businessHoursWindowUtcMs(dayKey: string): { windowStartMs: number; windowEndMs: number } {
  // dayKey: YYYY-MM-DD
  const startIso = `${dayKey}T${String(BookingSlotRuleDomainService.BUSINESS_OPEN_HOUR_UTC).padStart(2, '0')}:00:00.000Z`;
  const endIso = `${dayKey}T${String(BookingSlotRuleDomainService.BUSINESS_CLOSE_HOUR_UTC).padStart(2, '0')}:00:00.000Z`;
  return {
    windowStartMs: Date.parse(startIso),
    windowEndMs: Date.parse(endIso),
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

function hasOverlap(slot: TimeRange, eventRanges: BookingCalendarEventTimeRange[]): boolean {
  const slotStart = slot.startAt.toTimestamp();
  const slotEnd = slot.endAt.toTimestamp();

  // eventRanges は start昇順が望ましいが、保証しなくてもOK
  return eventRanges.some((r) => r.start < slotEnd && slotStart < r.end);
}
