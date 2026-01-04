import { BookingStatus, BookingStatusEnum } from './BookingStatus/BookingStatus';

const NO_TRANSITIONS: BookingStatusEnum[] = [];

/**
 * Booking の状態遷移定義
 * - key: 現在の状態
 * - value: 遷移可能な次の状態一覧
 */
const BOOKING_STATUS_TRANSITIONS: Record<BookingStatusEnum, BookingStatusEnum[]> = {
  [BookingStatusEnum.Draft]: [BookingStatusEnum.Confirmed, BookingStatusEnum.Cancelled],
  [BookingStatusEnum.Confirmed]: [BookingStatusEnum.Completed, BookingStatusEnum.Cancelled],
  [BookingStatusEnum.Completed]: NO_TRANSITIONS,
  [BookingStatusEnum.Cancelled]: NO_TRANSITIONS,
};
/**
 * BookingLifecycle
 * - Booking の状態遷移ルールを表すステートマシン
 * - 状態そのものは持たない（純粋なドメインサービス）
 */
export class BookingLifecycle {
  /**
   * 遷移可能かどうか
   */
  static canTransition(
    from: BookingStatus,
    to: BookingStatus
  ): boolean {
    const allowed = BOOKING_STATUS_TRANSITIONS[from.value];
    return allowed.includes(to.value);
  }

  /**
   * 状態遷移を行う
   * - 不正な遷移の場合は例外
   */
  static transition(
    from: BookingStatus,
    to: BookingStatus
  ): BookingStatus {
    if (!BookingLifecycle.canTransition(from, to)) {
      throw new Error(
        `BookingStatus cannot transition from ${from.value} to ${to.value}`
      );
    }

    return to;
  }

  /**
   * 次に遷移可能なステータス一覧を取得
   */
  static nextStatuses(from: BookingStatus): BookingStatusEnum[] {
    return [...BOOKING_STATUS_TRANSITIONS[from.value]];
  }

  /**
   * 終端状態かどうか
   */
  static isTerminal(status: BookingStatus): boolean {
    return BOOKING_STATUS_TRANSITIONS[status.value].length === 0;
  }
}
