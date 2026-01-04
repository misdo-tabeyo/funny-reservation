import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * CalendarEventId
 * - 外部カレンダー上の「予定ID」を表す（プロバイダ非依存）
 * - 採番は外部システム側で行われるため generate() は持たない
 * - 形式はプロバイダにより異なるため、ドメインでは過度に縛らない
 */
export class CalendarEventId extends ValueObject<string, 'CalendarEventId'> {
  static readonly MIN_LENGTH = 1;
  static readonly MAX_LENGTH = 255;

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    if (typeof value !== 'string') {
      throw new Error('CalendarEventIdの型が不正です');
    }

    const trimmed = value.trim();
    if (trimmed.length < CalendarEventId.MIN_LENGTH || trimmed.length > CalendarEventId.MAX_LENGTH) {
      throw new Error('CalendarEventIdの文字数が不正です');
    }
  }
}
