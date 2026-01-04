import { ValueObject } from 'Domain/models/shared/ValueObject';

export type Currency = 'JPY';

export interface MoneyValue {
  amount: number; // 円（整数）
  currency: Currency;
}

/**
 * Money
 * - 通貨は当面 JPY のみ
 * - amount は整数（円）
 */
export class Money extends ValueObject<MoneyValue, 'Money'> {
  static readonly MIN_AMOUNT = 0;
  static readonly MAX_AMOUNT = 1_000_000_000; // ざっくり上限（要件で調整OK）

  constructor(value: MoneyValue) {
    super(value);
  }

  protected validate(value: MoneyValue): void {
    if (value.currency !== 'JPY') {
      throw new Error('Moneyの通貨が不正です');
    }

    if (!Number.isInteger(value.amount)) {
      throw new Error('Moneyの金額は整数である必要があります');
    }

    if (value.amount < Money.MIN_AMOUNT || value.amount > Money.MAX_AMOUNT) {
      throw new Error('Moneyの金額が不正です');
    }
  }

  get amount(): number {
    return this.value.amount;
  }

  get currency(): Currency {
    return this.value.currency;
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ amount: this.amount + other.amount, currency: this.currency });
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const next = this.amount - other.amount;
    if (next < Money.MIN_AMOUNT) {
      throw new Error('Moneyがマイナスになります');
    }
    return new Money({ amount: next, currency: this.currency });
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error('Moneyの通貨が一致しません');
    }
  }
}
