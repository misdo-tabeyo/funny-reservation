import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';

/**
 * BookingSlotRuleDomainService
 *
 * 予約枠の「時間帯としての可否」を判定するドメインサービス。
 *
 * 対象ルール（BookingAggregation.pu より）:
 * - 営業時間: start >= 10:00 かつ end <= 18:00
 * - 同日の予約が 0 件のときは開始時刻が制約される
 *   - 施工時間が閾値(既定:5時間)超: 10:00 / 11:00 / 12:00 開始のみ
 *   - 施工時間が閾値以下: 10:00 または 14:00 開始のみ
 * - 同日の予約が 1 件以上のとき
 *   - 施工時間が閾値超: 予約不可
 *   - 施工時間が閾値以下: 営業時間内なら OK
 *
 * NOTE:
 * - 将来的には「料金表(メニュー表)」の各項目に所要時間を持たせ、
 *   施工内容の合計時間から timeRange.duration を算出する想定。
 * - タイムゾーンは Domain の DateTime が canonical Z(UTC) を前提にしているため、
 *   営業時間判定も UTC の時刻（10:00Z-18:00Z）として扱う。
 */

export type BookingSlotRuleContext = {
  /** 同日の既存予約数（Draft/Confirmed を含む想定） */
  existingBookingsCount: number;
};

export type BookingSlotRuleResult = {
  ok: boolean;
  /** ok=false の理由（ログ/レスポンスにはそのまま出さず、診断用想定） */
  reason?: string;
};

export class BookingSlotRuleDomainService {
  static readonly BUSINESS_OPEN_HOUR_UTC = 10;
  static readonly BUSINESS_CLOSE_HOUR_UTC = 18;
  /** 5時間(=300分)を超える場合は「長時間枠」として扱う */
  static readonly LONG_DURATION_THRESHOLD_MINUTES = 5 * 60;

  /**
   * 候補枠が「予約可能な時間帯」か？
   */
  static canBook(timeRange: TimeRange, context: BookingSlotRuleContext): BookingSlotRuleResult {
    if (!Number.isInteger(context.existingBookingsCount) || context.existingBookingsCount < 0) {
      return { ok: false, reason: 'existingBookingsCount は 0 以上の整数である必要があります' };
    }

    const businessHours = this.isWithinBusinessHours(timeRange);
    if (!businessHours.ok) return businessHours;

  const isLongDuration = timeRange.duration.minutes > this.LONG_DURATION_THRESHOLD_MINUTES;

    // 同日の予約が 1 件以上ある場合
    if (context.existingBookingsCount >= 1) {
      if (isLongDuration) {
        return { ok: false, reason: '長時間枠: 同日に予約がある場合、予約できません' };
      }

      return { ok: true };
    }

    // 同日の予約が 0 件の場合
    const startHour = timeRange.startAt.toDate().getUTCHours();

    if (isLongDuration) {
      const allowed = startHour === 10 || startHour === 11 || startHour === 12;
      return allowed
        ? { ok: true }
        : { ok: false, reason: '長時間枠: 同日の予約が0件の場合、開始時刻は10/11/12時のみです' };
    }

    // 通常枠
    const allowed = startHour === 10 || startHour === 14;
    return allowed
      ? { ok: true }
      : { ok: false, reason: '通常枠: 同日の予約が0件の場合、開始時刻は10時または14時のみです' };
  }

  private static isWithinBusinessHours(timeRange: TimeRange): BookingSlotRuleResult {
    const start = timeRange.startAt.toDate();
    const end = timeRange.endAt.toDate();

    // 同日内で完結する前提（1時間単位なので自然に満たす想定だが、保険）
    const sameUtcDate =
      start.getUTCFullYear() === end.getUTCFullYear() &&
      start.getUTCMonth() === end.getUTCMonth() &&
      start.getUTCDate() === end.getUTCDate();
    if (!sameUtcDate) {
      return { ok: false, reason: 'TimeRange は同一日内で完結している必要があります' };
    }

    const startHour = start.getUTCHours();
    const endHour = end.getUTCHours();
    const endMinute = end.getUTCMinutes();
    const endSecond = end.getUTCSeconds();
    const endMs = end.getUTCMilliseconds();

    // start >= 10:00
    if (startHour < this.BUSINESS_OPEN_HOUR_UTC) {
      return { ok: false, reason: '営業時間外です（開始が10:00より前）' };
    }

    // end <= 18:00 （ちょうど18:00はOK）
    const endIsExactlyClose =
      endHour === this.BUSINESS_CLOSE_HOUR_UTC && endMinute === 0 && endSecond === 0 && endMs === 0;
    const endIsBeforeClose = endHour < this.BUSINESS_CLOSE_HOUR_UTC;

    if (!(endIsBeforeClose || endIsExactlyClose)) {
      return { ok: false, reason: '営業時間外です（終了が18:00を超過）' };
    }

    return { ok: true };
  }
}
