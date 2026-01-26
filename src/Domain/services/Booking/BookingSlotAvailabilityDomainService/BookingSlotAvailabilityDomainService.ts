import { TimeRange } from 'Domain/models/Booking/TimeRange/TimeRange';

/**
 * 予約枠の可用性チェック（Domain Service）
 *
 * 目的:
 * - 指定枠が「既存の予約(仮予定含む)」によって利用不能かを判定する
 *
 * 利用不能(unavailable) の定義:
 * - 既存イベントと時間が重なる（overlap）
 * - 既存イベントの前後に必要なバッファ（既定:60分）を確保できない
 *
 * NOTE:
 * - 営業時間や開始時刻制約(10/14など)は別のドメインルールで扱う
 * - Domain 層は外部APIに依存しないため、問い合わせ口は Port(interface) として表現する
 */

export type BookingSlotAvailabilityContext = {
  /** 予約間バッファ（分）。default: 60 */
  bufferMinutes?: number;
};

export interface IBookingSlotAvailabilityQuery {
  /**
   * 指定枠が「利用不能」か？
   * true なら利用不能（= overlap または buffer 未確保）
   */
  existsUnavailableSlot(params: {
    timeRange: TimeRange;
    bufferMinutes: number;
  }): Promise<boolean>;
}

/**
 * chapter12（Repository/Infrastructure導入）までの仮実装
 * - 常に「利用不能ではない」
 */
class StubBookingSlotAvailabilityQuery implements IBookingSlotAvailabilityQuery {
  async existsUnavailableSlot(params: {
    timeRange: TimeRange;
    bufferMinutes: number;
  }): Promise<boolean> {
    void params;
    return false;
  }
}

export class BookingSlotAvailabilityDomainService {
  static readonly DEFAULT_BUFFER_MINUTES = 60;

  constructor(
    private readonly availabilityQuery: IBookingSlotAvailabilityQuery =
      new StubBookingSlotAvailabilityQuery(),
  ) {}

  /**
   * true: 利用不能（埋まっている/バッファ未確保）
   * false: 利用可能
   */
  async execute(params: {
    timeRange: TimeRange;
    context?: BookingSlotAvailabilityContext;
  }): Promise<boolean> {
    const bufferMinutes =
      params.context?.bufferMinutes ?? BookingSlotAvailabilityDomainService.DEFAULT_BUFFER_MINUTES;

    if (!Number.isFinite(bufferMinutes) || bufferMinutes < 0) {
      throw new Error('bufferMinutes は 0 以上の数である必要があります');
    }

    // Google Calendar 側に問い合わせて「利用不能」判定
    return this.availabilityQuery.existsUnavailableSlot({
      timeRange: params.timeRange,
      bufferMinutes: Math.trunc(bufferMinutes),
    });
  }
}
