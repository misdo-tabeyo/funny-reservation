import { isEqual } from 'lodash';

export abstract class ValueObject<T, U> {
  // TypeScriptの構造的型付け対策（構造的には同じでも、このプライベートプロパティのおかげで異なる型として認識させることができる）
  // @ts-expect-error
  private _type: U;

  protected readonly _value: T;

  constructor(value: T) {
    this.validate(value);
    this._value = value;
  }

  protected abstract validate(value: T): void;

  get value(): T {
    return this._value;
  }

  equals(other: ValueObject<T, U>): boolean {
    return isEqual(this._value, other._value);
  }
}
