import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { ValueObject } from '../ValueObject';

dayjs.extend(customParseFormat);

/**
 * DateTime
 * - ISO 8601 (JST, +09:00付き) のみ許容
 * - 内部保持も常に canonical (YYYY-MM-DDTHH:mm:ss.SSS+09:00) に統一
 */
export class DateTime extends ValueObject<string, 'DateTime'> {
  // canonical を固定する（+09:00付き、ミリ秒付き）
  static readonly CANONICAL_FORMAT = 'YYYY-MM-DDTHH:mm:ss.SSSZ';
  static readonly REQUIRED_OFFSET = '+09:00';

  constructor(value: string) {
    // 「constructorで正規化→super」方式
    const canonical = DateTime.normalize(value);
    super(canonical);
  }

  static now(): DateTime {
    // JST(+09:00) の現在時刻を canonical で返す
    const now = Date.now();
    return DateTime.fromTimestamp(now);
  }

  static fromDate(date: Date): DateTime {
    return DateTime.fromTimestamp(date.getTime());
  }

  static fromTimestamp(ms: number): DateTime {
    if (!Number.isFinite(ms)) {
      throw new Error('不正なDateTimeの値です');
    }
    // 「絶対時刻(ms)」を JST(+09:00) 表記にして canonical を得る
    // JST固定なので、ms に 9時間を足して「UTCとして」各フィールドを取り出す（DSTが無い前提で安定）。
    const d = new Date(ms + 9 * 60 * 60 * 1000);
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    const hh = String(d.getUTCHours()).padStart(2, '0');
    const mm = String(d.getUTCMinutes()).padStart(2, '0');
    const ss = String(d.getUTCSeconds()).padStart(2, '0');
    const ms3 = String(d.getUTCMilliseconds()).padStart(3, '0');
    const canonical = `${y}-${m}-${day}T${hh}:${mm}:${ss}.${ms3}${DateTime.REQUIRED_OFFSET}`;
    return new DateTime(canonical);
  }

  static normalize(raw: string): string {
    // まず「+09:00付きのISO(ミリ秒必須)」以外は形式エラー
    // 例: 2026-01-04T09:00:00.000+09:00 のみOK
    const isoJst = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+09:00$/;
    if (!isoJst.test(raw)) throw new Error('不正なDateTimeの形式です');

    // 実在日付を保証（Date.parse で十分に厳格: 形式は正規表現で固定済み）
    const ts = Date.parse(raw);
    if (Number.isNaN(ts)) throw new Error('不正なDateTimeの値です');

    // canonical を返す（形式自体は固定されているので基本はそのまま）
    return raw;
  }

  protected validate(value: string): void {
    // superに渡る値は normalize 済みなので、防御的に最低限
    const ts = Date.parse(value);
    if (Number.isNaN(ts)) throw new Error('不正なDateTimeの値です');
  }

  toDate(): Date {
    return new Date(this.toTimestamp());
  }

  toTimestamp(): number {
    const ts = Date.parse(this.value);
    if (Number.isNaN(ts)) {
      // constructor が normalize 済みなので通常ありえない
      throw new Error('不正なDateTimeの値です');
    }
    return ts;
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
    const next = this.toTimestamp() + minutes * 60 * 1000;
    return DateTime.fromTimestamp(next);
  }
}
