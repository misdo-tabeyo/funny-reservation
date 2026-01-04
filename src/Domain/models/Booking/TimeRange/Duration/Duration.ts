import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * Duration (所要時間)
 * - 予約は1時間単位
 * - 内部的には分で保持するが、60分の倍数のみ許容
 */
export class Duration extends ValueObject<number, 'Duration'> {
  static readonly MIN_MINUTES = 60; // 1時間

  constructor(minutes: number) {
    super(minutes);
  }

  get minutes(): number {
    return this.value;
  }

  get hours(): number {
    return this.minutes / 60;
  }

  /**
   * 時間単位から生成
   */
  static fromHours(hours: number): Duration {
    return new Duration(hours * 60);
  }

  protected validate(value: number): void {
    if (!Number.isInteger(value)) {
      throw new Error('Durationは整数である必要があります');
    }

    if (value < Duration.MIN_MINUTES) {
      throw new Error('Durationは1時間以上である必要があります');
    }

    if (value % 60 !== 0) {
      throw new Error('Durationは1時間単位で指定する必要があります');
    }
  }

  add(other: Duration): Duration {
    return new Duration(this.minutes + other.minutes);
  }

  subtract(other: Duration): Duration {
    return new Duration(this.minutes - other.minutes);
  }

  /**
   * 表示用フォーマット（例: "1時間", "3時間"）
   */
  toDisplay(): string {
    return `${this.hours}時間`;
  }
}
