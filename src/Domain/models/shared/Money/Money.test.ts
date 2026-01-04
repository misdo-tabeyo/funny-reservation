import { Money } from './Money';

describe('Money', () => {
  // 正常系
  test('有効な値の場合にMoneyが生成される', () => {
    const money = new Money({ amount: 1000, currency: 'JPY' });
    expect(money.amount).toBe(1000);
    expect(money.currency).toBe('JPY');
  });

  test('add', () => {
    const a = new Money({ amount: 1000, currency: 'JPY' });
    const b = new Money({ amount: 200, currency: 'JPY' });
    expect(a.add(b).amount).toBe(1200);
  });

  test('subtract', () => {
    const a = new Money({ amount: 1000, currency: 'JPY' });
    const b = new Money({ amount: 200, currency: 'JPY' });
    expect(a.subtract(b).amount).toBe(800);
  });

  // 異常系
  test('不正な通貨の場合にエラーを投げる', () => {
    expect(() => {
      // @ts-expect-error テストのために無効な通貨を渡す
      new Money({ amount: 1000, currency: 'USD' });
    }).toThrow('Moneyの通貨が不正です');
  });

  test('金額が整数でない場合にエラーを投げる', () => {
    expect(() => new Money({ amount: 1.5, currency: 'JPY' })).toThrow(
      'Moneyの金額は整数である必要があります'
    );
  });

  test('不正な金額の場合にエラーを投げる', () => {
    expect(() => new Money({ amount: -1, currency: 'JPY' })).toThrow('Moneyの金額が不正です');
    expect(() => new Money({ amount: Money.MAX_AMOUNT + 1, currency: 'JPY' })).toThrow(
      'Moneyの金額が不正です'
    );
  });

  test('subtractでマイナスになる場合にエラーを投げる', () => {
    const a = new Money({ amount: 100, currency: 'JPY' });
    const b = new Money({ amount: 200, currency: 'JPY' });
    expect(() => a.subtract(b)).toThrow('Moneyがマイナスになります');
  });
});
