import { DateTime } from './DateTime';

describe('DateTime', () => {
  // 正常系
  test('有効なフォーマットの場合 canonical が生成される', () => {
    expect(new DateTime('2026-01-04T00:00:00.000+09:00').value).toBe(
      '2026-01-04T00:00:00.000+09:00'
    );

    // 形式はcanonical固定なので、そのまま保持される
    expect(new DateTime('2026-12-31T23:59:59.999+09:00').value).toBe(
      '2026-12-31T23:59:59.999+09:00'
    );
  });

  test('now() は canonical 形式の value を返す', () => {
    const dt = DateTime.now();
    expect(dt.value).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}\+09:00$/);
  });

  test('fromDate() は Date を canonical に変換する', () => {
    const date = new Date('2026-01-04T00:00:00.000Z');
    const dt = DateTime.fromDate(date);
    expect(dt.value).toBe('2026-01-04T09:00:00.000+09:00');
  });

  test('toDate() は Date に変換できる', () => {
    const dt = new DateTime('2026-01-04T09:00:00.000+09:00');
    expect(dt.toDate().toISOString()).toBe('2026-01-04T00:00:00.000Z');
  });

  test('toTimestamp() はミリ秒タイムスタンプを返す', () => {
    const dt = new DateTime('2026-01-04T09:00:00.000+09:00');
    expect(dt.toTimestamp()).toBe(new Date('2026-01-04T00:00:00.000Z').getTime());
  });

  test('isBefore/isAfter/isSame', () => {
    const a = new DateTime('2026-01-04T09:00:00.000+09:00');
    const b = new DateTime('2026-01-04T09:00:01.000+09:00');
    const c = new DateTime('2026-01-04T09:00:00.000+09:00');

    expect(a.isBefore(b)).toBeTruthy();
    expect(b.isAfter(a)).toBeTruthy();
    expect(a.isSame(c)).toBeTruthy();
    expect(a.isAfter(b)).toBeFalsy();
    expect(b.isBefore(a)).toBeFalsy();
  });

  test('addMinutes() で分を加算できる', () => {
    const dt = new DateTime('2026-01-04T09:00:00.000+09:00');
    expect(dt.addMinutes(1).value).toBe('2026-01-04T09:01:00.000+09:00');
    expect(dt.addMinutes(60).value).toBe('2026-01-04T10:00:00.000+09:00');
  });

  // 異常系
  test('不正な形式の場合にエラーを投げる', () => {
    expect(() => new DateTime('2026/01/04 00:00:00')).toThrow(
      '不正なDateTimeの形式です'
    );
    expect(() => new DateTime('invalid')).toThrow('不正なDateTimeの形式です');

    // オフセットなしはNG（仕様）
    expect(() => new DateTime('2026-01-04T00:00:00.000')).toThrow(
      '不正なDateTimeの形式です'
    );

    // ミリ秒なしもNG（仕様）
    expect(() => new DateTime('2026-01-04T00:00:00+09:00')).toThrow(
      '不正なDateTimeの形式です'
    );

    // Z(UTC) はNG（仕様）
    expect(() => new DateTime('2026-01-04T00:00:00.000Z')).toThrow(
      '不正なDateTimeの形式です'
    );
  });

  test('パース不能な値の場合にエラーを投げる', () => {
    // 見た目は正しいがパース不能な値
    expect(() => new DateTime('2026-99-99T00:00:00.000+09:00')).toThrow(
      '不正なDateTimeの値です'
    );

    // 月が13
    expect(() => new DateTime('2026-13-01T00:00:00.000+09:00')).toThrow(
      '不正なDateTimeの値です'
    );
  });
});
