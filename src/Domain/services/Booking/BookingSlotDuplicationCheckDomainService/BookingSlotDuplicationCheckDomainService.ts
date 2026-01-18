// src/Domain/services/Booking/BookingSlotDuplicationCheckDomainService/BookingSlotDuplicationCheckDomainService.ts
import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';

/**
 * 予約枠の重複チェック（Domain Service）
 *
 * - 「予約枠が空いているか？」は Booking 自身の責務というより、
 *   外部のカレンダー（正）に問い合わせて判定するのが自然。
 * - ただし Domain 層は外部API（Google Calendar）に直接依存しない。
 *   そのため、問い合わせ口は Port(interface) として表現し、実装は後で差し替える。
 */
export interface IBookingSlotAvailabilityQuery {
  /**
   * 指定枠に「すでに予約（イベント）が存在するか？」
   * true なら重複あり（埋まっている）
   */
  existsOverlappingSlot(params: { timeRange: TimeRange }): Promise<boolean>;
}

/**
 * chapter12（Repository/Infrastructure導入）までの仮実装
 * - 常に「重複なし」
 * - 後で Google Calendar 実装に差し替える
 */
class StubBookingSlotAvailabilityQuery implements IBookingSlotAvailabilityQuery {
  async existsOverlappingSlot(params: { timeRange: TimeRange }): Promise<boolean> {
    void params;
    return false;
  }
}

export class BookingSlotDuplicationCheckDomainService {
  constructor(
    private readonly availabilityQuery: IBookingSlotAvailabilityQuery = new StubBookingSlotAvailabilityQuery(),
  ) {}

  /**
   * true: 重複あり（埋まっている）
   * false: 重複なし（空いている）
   */
  async execute(params: { timeRange: TimeRange }): Promise<boolean> {
    return this.availabilityQuery.existsOverlappingSlot(params);
  }
}
