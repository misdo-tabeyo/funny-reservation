import { Duration } from './Duration';

describe('Duration', () => {
  // 正常系
  test('有効な値の場合 Duration を生成できる', () => {
    expect(new Duration(1).hours).toBe(1);
    expect(new Duration(2).hours).toBe(2);
  });

  test('minutes が正しく計算される', () => {
    expect(new Duration(1).minutes).toBe(60);
    expect(new Duration(3).minutes).toBe(180);
  });

  test('add()', () => {
    const d1 = new Duration(1);
    const d2 = new Duration(2);
    expect(d1.add(d2).hours).toBe(3);
  });

  test('subtract()', () => {
    const d1 = new Duration(3);
    const d2 = new Duration(1);
    expect(d1.subtract(d2).hours).toBe(2);
  });

  test('toDisplay()', () => {
    expect(new Duration(1).toDisplay()).toBe('1時間');
    expect(new Duration(4).toDisplay()).toBe('4時間');
  });

  // 異常系
  test('整数でない場合にエラーを投げる', () => {
    expect(() => new Duration(1.5)).toThrow('Durationは整数である必要があります');
  });

  test('1時間未満の場合にエラーを投げる', () => {
    expect(() => new Duration(0)).toThrow('Durationは1時間以上である必要があります');
  });

  test('subtract() の結果が 1時間未満になる場合にエラーを投げる', () => {
    const d1 = new Duration(1);
    const d2 = new Duration(2);
    expect(() => d1.subtract(d2)).toThrow('Durationは1時間以上である必要があります');
  });
});
