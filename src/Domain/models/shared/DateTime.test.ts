import { DateTime } from './DateTime';

describe('DateTime', () => {
  // 正常系
  test('有効なフォーマットの場合 canonical が生成される', () => {
    expect(new DateTime('2026-01-04T00:00:00.000Z').value).toBe(
      '2026-01-04T00:00:00.000Z'
    );

    // 形式はcanonical固定なので、そのまま保持される
    expect(new DateTime('2026-12-31T23:59:59.999Z').value).toBe(
      '2026-12-31T23:59:59.999Z'
    );
  });

  test('now() は canonical 形式の value を返す', () => {
    const dt = DateTime.now();
    expect(dt.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  test('fromDate() は Date を canonical に変換する', () => {
    const date = new Date('2026-01-04T00:00:00.000Z');
    const dt = DateTime.fromDate(date);
    expect(dt.value).toBe('2026-01-04T00:00:00.000Z');
  });

  test('toDate() は Date に変換できる', () => {
    const dt = new DateTime('2026-01-04T00:00:00.000Z');
    expect(dt.toDate().toISOString()).toBe('2026-01-04T00:00:00.000Z');
  });

  test('toTimestamp() はミリ秒タイムスタンプを返す', () => {
    const dt = new DateTime('2026-01-04T00:00:00.000Z');
    expect(dt.toTimestamp()).toBe(new Date('2026-01-04T00:00:00.000Z').getTime());
  });

  test('isBefore/isAfter/isSame', () => {
    const a = new DateTime('2026-01-04T00:00:00.000Z');
    const b = new DateTime('2026-01-04T00:00:01.000Z');
    const c = new DateTime('2026-01-04T00:00:00.000Z');

    expect(a.isBefore(b)).toBeTruthy();
    expect(b.isAfter(a)).toBeTruthy();
    expect(a.isSame(c)).toBeTruthy();
    expect(a.isAfter(b)).toBeFalsy();
    expect(b.isBefore(a)).toBeFalsy();
  });

  test('addMinutes() で分を加算できる', () => {
    const dt = new DateTime('2026-01-04T00:00:00.000Z');
    expect(dt.addMinutes(1).value).toBe('2026-01-04T00:01:00.000Z');
    expect(dt.addMinutes(60).value).toBe('2026-01-04T01:00:00.000Z');
  });

  // 異常系
  test('不正な形式の場合にエラーを投げる', () => {
    expect(() => new DateTime('2026/01/04 00:00:00')).toThrow(
      '不正なDateTimeの形式です'
    );
    expect(() => new DateTime('invalid')).toThrow('不正なDateTimeの形式です');

    // ZなしはNG（仕様）
    expect(() => new DateTime('2026-01-04T00:00:00.000')).toThrow(
      '不正なDateTimeの形式です'
    );

    // ミリ秒なしもNG（仕様）
    expect(() => new DateTime('2026-01-04T00:00:00Z')).toThrow(
      '不正なDateTimeの形式です'
    );
  });

  test('パース不能な値の場合にエラーを投げる', () => {
    // 見た目はISO+Z+msだが存在しない日付
    expect(() => new DateTime('2026-02-30T00:00:00.000Z')).toThrow(
      '不正なDateTimeの値です'
    );

    // 月が13
    expect(() => new DateTime('2026-13-01T00:00:00.000Z')).toThrow(
      '不正なDateTimeの値です'
    );
  });
});
