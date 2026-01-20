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

  /**
   * 指定日の「同日の既存予約数」を返す。
   *
   * 定義:
   * - 予約の正は Google Calendar とする
   * - 「同日の既存予約数」=「その日(JST)の営業時間帯(10:00-18:00+09:00)と重なるイベント数」
   * - cancelled は除外する
   */
  countActiveEventsOverlappingBusinessHoursByJstDay(params: {
    /** YYYY-MM-DD (JST) */
    jstDayKey: string;
  }): Promise<number>;
}
