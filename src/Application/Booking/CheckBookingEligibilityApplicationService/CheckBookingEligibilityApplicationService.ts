import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';
import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { BookingSlotDuplicationCheckDomainService } from 'Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService';
import { BookingSlotRuleDomainService } from 'Domain/services/Booking/BookingSlotRuleDomainService/BookingSlotRuleDomainService';
import { IBookingCalendarEventQuery } from 'Application/Booking/IBookingCalendarEventQuery';

export type CheckBookingEligibilityQuery = {
  startAt: string; // canonical ISO (Z + ms)
  durationMinutes: number;
};

export type BookingEligibilityResult = {
  bookable: boolean;
  /** 診断用。UI/ログどちらにも使えるように複数保持する */
  reasons: string[];
  /** 内部で正規化された TimeRange（デバッグ用） */
  normalized?: {
    startAt: string;
    endAt: string;
    durationMinutes: number;
  };
};

/**
 * 指定枠が「予約可能」かを判定する。
 *
 * 予約可能の定義（恒久）:
 * - ビジネスルール（営業時間 / 開始時刻制約 / 長時間枠など）を満たす
 * - Googleカレンダー（正）に重複する予定が存在しない
 */
export class CheckBookingEligibilityApplicationService {
  constructor(
    private readonly calendarEventQuery: IBookingCalendarEventQuery,
    private readonly duplicationCheckDomainService: BookingSlotDuplicationCheckDomainService,
  ) {}

  async execute(query: CheckBookingEligibilityQuery): Promise<BookingEligibilityResult> {
    // Domainオブジェクトで validate
    const startAt = new DateTime(query.startAt);
    const duration = new Duration(query.durationMinutes);
    const timeRange = new TimeRange(startAt, duration);

    const utcDayKey = toUtcDayKey(timeRange.startAt);
    const existingBookingsCount = await this.calendarEventQuery.countActiveEventsOverlappingBusinessHoursByUtcDay({
      utcDayKey,
    });

    const rule = BookingSlotRuleDomainService.canBook(timeRange, { existingBookingsCount });
    if (!rule.ok) {
      return {
        bookable: false,
        reasons: [rule.reason ?? '予約ルールにより予約できません'],
        normalized: {
          startAt: timeRange.startAt.value,
          endAt: timeRange.endAt.value,
          durationMinutes: timeRange.duration.minutes,
        },
      };
    }

    const duplicated = await this.duplicationCheckDomainService.execute({ timeRange });
    if (duplicated) {
      return {
        bookable: false,
        reasons: ['指定の枠は既に埋まっています'],
        normalized: {
          startAt: timeRange.startAt.value,
          endAt: timeRange.endAt.value,
          durationMinutes: timeRange.duration.minutes,
        },
      };
    }

    return {
      bookable: true,
      reasons: [],
      normalized: {
        startAt: timeRange.startAt.value,
        endAt: timeRange.endAt.value,
        durationMinutes: timeRange.duration.minutes,
      },
    };
  }
}

function toUtcDayKey(dt: DateTime): string {
  const d = dt.toDate();
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
