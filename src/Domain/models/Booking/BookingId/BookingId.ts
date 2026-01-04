import { ValueObject } from 'Domain/models/shared/ValueObject';
import { nanoid } from 'nanoid';

export class BookingId extends ValueObject<string, 'BookingId'> {
  static readonly MIN_LENGTH = 10;
  static readonly MAX_LENGTH = 50;
  static readonly FORMAT = /^[a-zA-Z0-9_-]+$/;

  constructor(value: string) {
    super(value);
  }

  static generate(): BookingId {
    return new BookingId(nanoid());
  }

  protected validate(value: string): void {
    // 文字数チェック
    if (value.length < BookingId.MIN_LENGTH || value.length > BookingId.MAX_LENGTH) {
      throw new Error('BookingIdの文字数が不正です');
    }

    // URL-safe な文字のみ
    if (!BookingId.FORMAT.test(value)) {
      throw new Error('不正なBookingIdの形式です');
    }
  }
}
