import { ValueObject } from 'Domain/models/shared/ValueObject';

export enum BookingStatusEnum {
  Draft = 'Draft',
  Confirmed = 'Confirmed',
  Cancelled = 'Cancelled',
  Completed = 'Completed',
}

export type BookingStatusLabel = '下書き' | '確定' | 'キャンセル' | '完了';

type BookingStatusValue = BookingStatusEnum;

/**
 * ステータス定義マップ
 */
const BOOKING_STATUS_MAP = {
  [BookingStatusEnum.Draft]: { label: '下書き' },
  [BookingStatusEnum.Confirmed]: { label: '確定' },
  [BookingStatusEnum.Cancelled]: { label: 'キャンセル' },
  [BookingStatusEnum.Completed]: { label: '完了' },
} satisfies Record<BookingStatusEnum, { label: BookingStatusLabel }>;

export class BookingStatus extends ValueObject<BookingStatusValue, 'BookingStatus'> {
  constructor(value: BookingStatusValue) {
    super(value);
  }

  static initial(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.Draft);
  }
  static draft(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.Draft);
  }
  static confirmed(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.Confirmed);
  }
  static cancelled(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.Cancelled);
  }
  static completed(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.Completed);
  }

  protected validate(value: BookingStatusValue): void {
    if (!(value in BOOKING_STATUS_MAP)) {
      throw new Error('無効なBookingStatusです');
    }
  }

  toLabel(): BookingStatusLabel {
    return BOOKING_STATUS_MAP[this.value].label;
  }

  get isDraft(): boolean {
    return this.value === BookingStatusEnum.Draft;
  }

  get isConfirmed(): boolean {
    return this.value === BookingStatusEnum.Confirmed;
  }

  get isCancelled(): boolean {
    return this.value === BookingStatusEnum.Cancelled;
  }

  get isCompleted(): boolean {
    return this.value === BookingStatusEnum.Completed;
  }
}
