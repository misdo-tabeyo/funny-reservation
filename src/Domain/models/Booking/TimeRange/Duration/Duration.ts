import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * Duration (所要時間)
 * - 予約は1時間単位
 * - 内部的には時間で保持
 */
export class Duration extends ValueObject<number, 'Duration'> {
  static readonly MIN_HOURS = 1; // 1時間

  constructor(hours: number) {
    super(hours);
  }

  get hours(): number {
    return this.value;
  }

  get minutes(): number {
    return this.hours * 60;
  }

  protected validate(value: number): void {
    if (!Number.isInteger(value)) {
      throw new Error('Durationは整数である必要があります');
    }

    if (value < Duration.MIN_HOURS) {
      throw new Error('Durationは1時間以上である必要があります');
    }
  }

  add(other: Duration): Duration {
    return new Duration(this.hours + other.hours);
  }

  subtract(other: Duration): Duration {
    return new Duration(this.hours - other.hours);
  }

  /**
   * 表示用フォーマット（例: "1時間", "3時間"）
   */
  toDisplay(): string {
    return `${this.hours}時間`;
  }
}
