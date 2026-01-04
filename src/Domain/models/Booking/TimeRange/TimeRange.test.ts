import { DateTime } from 'Domain/models/shared/DateTime/DateTime';
import { Duration } from 'Domain/models/Booking/TimeRange/Duration/Duration';
import { TimeRange } from './TimeRange';

describe('TimeRange', () => {
  // 正常系
  test('有効なフォーマットの場合 TimeRange が生成される', () => {
    const startAt = new DateTime('2026-01-04T00:00:00.000Z');
    const duration = Duration.fromHours(2);

    const range = new TimeRange(startAt, duration);

    expect(range.startAt.value).toBe('2026-01-04T00:00:00.000Z');
    expect(range.duration.minutes).toBe(120);
  });

  test('endAt が startAt + duration になる', () => {
    const startAt = new DateTime('2026-01-04T00:00:00.000Z');
    const duration = Duration.fromHours(3);

    const range = new TimeRange(startAt, duration);

    expect(range.endAt.value).toBe('2026-01-04T03:00:00.000Z');
  });

  test('overlaps() 区間が重なる場合 true', () => {
    const a = new TimeRange(
      new DateTime('2026-01-04T00:00:00.000Z'),
      Duration.fromHours(2) // [00:00, 02:00)
    );
    const b = new TimeRange(
      new DateTime('2026-01-04T01:00:00.000Z'),
      Duration.fromHours(2) // [01:00, 03:00)
    );

    expect(a.overlaps(b)).toBeTruthy();
    expect(b.overlaps(a)).toBeTruthy();
  });

  test('overlaps() 境界が接するだけの場合 false', () => {
    const a = new TimeRange(
      new DateTime('2026-01-04T00:00:00.000Z'),
      Duration.fromHours(2) // [00:00, 02:00)
    );
    const b = new TimeRange(
      new DateTime('2026-01-04T02:00:00.000Z'),
      Duration.fromHours(1) // [02:00, 03:00)
    );

    expect(a.overlaps(b)).toBeFalsy();
    expect(b.overlaps(a)).toBeFalsy();
  });

  test('contains() start は含む / end は含まない', () => {
    const range = new TimeRange(
      new DateTime('2026-01-04T00:00:00.000Z'),
      Duration.fromHours(2) // [00:00, 02:00)
    );

    expect(range.contains(new DateTime('2026-01-04T00:00:00.000Z'))).toBeTruthy();
    expect(range.contains(new DateTime('2026-01-04T01:59:59.999Z'))).toBeTruthy();
    expect(range.contains(new DateTime('2026-01-04T02:00:00.000Z'))).toBeFalsy();
  });

  // 異常系
  test('開始時刻が1時間単位でない場合にエラーを投げる', () => {
    const startAt = new DateTime('2026-01-04T00:30:00.000Z');
    const duration = Duration.fromHours(1);

    expect(() => new TimeRange(startAt, duration)).toThrow(
      'TimeRangeの開始時刻は1時間単位で指定する必要があります'
    );
  });
});
