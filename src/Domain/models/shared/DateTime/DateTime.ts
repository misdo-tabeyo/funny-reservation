import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ValueObject } from '../ValueObject';

dayjs.extend(utc);
dayjs.extend(customParseFormat);

/**
 * DateTime
 * - ISO 8601 (UTC, Z付き) のみ許容
 * - 内部保持も常に canonical (YYYY-MM-DDTHH:mm:ss.SSSZ) に統一
 */
export class DateTime extends ValueObject<string, 'DateTime'> {
  // canonical を固定する（Z付き、ミリ秒付き）
  static readonly CANONICAL_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSS[Z]';

  constructor(value: string) {
    // 「constructorで正規化→super」方式
    const canonical = DateTime.normalize(value);
    super(canonical);
  }

  static now(): DateTime {
    return new DateTime(dayjs().utc().format(DateTime.CANONICAL_FORMAT));
  }

  static fromDate(date: Date): DateTime {
    return new DateTime(dayjs(date).utc().format(DateTime.CANONICAL_FORMAT));
  }

  static normalize(raw: string): string {
    // まず「Z付きのISO」以外は形式エラー
    // 例: 2026-01-04T00:00:00.000Z のみOK
    const isoZ = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    if (!isoZ.test(raw)) {
      throw new Error('不正なDateTimeの形式です');
    }

    // UTCとして strict パースで実在日付を保証
    const parsed = dayjs.utc(raw, DateTime.CANONICAL_FORMAT, true);
    if (!parsed.isValid()) {
      throw new Error('不正なDateTimeの値です');
    }

    // canonical を返す（入力がcanonicalならそのまま）
    return parsed.format(DateTime.CANONICAL_FORMAT);
  }

  protected validate(value: string): void {
    // superに渡る値は normalize 済みなので、防御的に最低限
    const parsed = dayjs.utc(value, DateTime.CANONICAL_FORMAT, true);
    if (!parsed.isValid()) {
      throw new Error('不正なDateTimeの値です');
    }
  }

  toDate(): Date {
    return dayjs.utc(this.value, DateTime.CANONICAL_FORMAT, true).toDate();
  }

  toTimestamp(): number {
    return dayjs.utc(this.value, DateTime.CANONICAL_FORMAT, true).valueOf();
  }

  isBefore(other: DateTime): boolean {
    return this.toTimestamp() < other.toTimestamp();
  }

  isAfter(other: DateTime): boolean {
    return this.toTimestamp() > other.toTimestamp();
  }

  isSame(other: DateTime): boolean {
    return this.toTimestamp() === other.toTimestamp();
  }

  addMinutes(minutes: number): DateTime {
    const next = dayjs
      .utc(this.value, DateTime.CANONICAL_FORMAT, true)
      .add(minutes, 'minute');

    return new DateTime(next.format(DateTime.CANONICAL_FORMAT));
  }
}
