import { Duration } from './Duration';

describe('Duration', () => {
  // 正常系
  test('有効な値の場合 Duration を生成できる', () => {
    expect(new Duration(60).minutes).toBe(60);
    expect(new Duration(120).minutes).toBe(120);
  });

  test('hours が正しく計算される', () => {
    expect(new Duration(60).hours).toBe(1);
    expect(new Duration(180).hours).toBe(3);
  });

  test('fromHours() で生成できる', () => {
    expect(Duration.fromHours(1).minutes).toBe(60);
    expect(Duration.fromHours(2).minutes).toBe(120);
  });

  test('add()', () => {
    const d1 = new Duration(60);
    const d2 = new Duration(120);
    expect(d1.add(d2).minutes).toBe(180);
  });

  test('subtract()', () => {
    const d1 = new Duration(180);
    const d2 = new Duration(60);
    expect(d1.subtract(d2).minutes).toBe(120);
  });

  test('toDisplay()', () => {
    expect(new Duration(60).toDisplay()).toBe('1時間');
    expect(new Duration(240).toDisplay()).toBe('4時間');
  });

  // 異常系
  test('整数でない場合にエラーを投げる', () => {
    expect(() => new Duration(60.5)).toThrow('Durationは整数である必要があります');
  });

  test('1時間未満の場合にエラーを投げる', () => {
    expect(() => new Duration(0)).toThrow('Durationは1時間以上である必要があります');
    expect(() => new Duration(59)).toThrow('Durationは1時間以上である必要があります');
  });

  test('1時間単位でない場合にエラーを投げる', () => {
    expect(() => new Duration(90)).toThrow('Durationは1時間単位で指定する必要があります');
    expect(() => new Duration(150)).toThrow('Durationは1時間単位で指定する必要があります');
  });

  test('subtract() の結果が 1時間未満になる場合にエラーを投げる', () => {
    const d1 = new Duration(60);
    const d2 = new Duration(120);
    expect(() => d1.subtract(d2)).toThrow('Durationは1時間以上である必要があります');
  });
});
