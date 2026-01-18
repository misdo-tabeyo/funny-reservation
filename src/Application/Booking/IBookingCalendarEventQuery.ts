import { DateTime } from 'Domain/models/shared/DateTime/DateTime';

/**
 * Calendar Event Query (read model)
 * - 予約枠探索などのために、指定期間のイベント一覧を取得する
 * - Domain は外部APIに依存しないため、Application 層に Port として置く
 */
export type BookingCalendarEventTimeRange = {
  /** timestamp (ms) */
  start: number;
  /** timestamp (ms) */
  end: number;
};

export interface IBookingCalendarEventQuery {
  /**
   * 指定期間の「有効なイベント」を取得する
   * - cancelled は除外すること
   * - start/end は [start, end) として扱える形で返すこと
   */
  listActiveEventTimeRanges(params: {
    timeMin: DateTime;
    timeMax: DateTime;
  }): Promise<BookingCalendarEventTimeRange[]>;
}
