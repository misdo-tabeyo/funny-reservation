import { ValueObject } from "Domain/models/shared/ValueObject";

export class Name extends ValueObject<string, 'Name'> {
  static readonly MIN_LENGTH = 1;
  static readonly MAX_LENGTH = 100;

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    if (value.length === 0 || value.length > Name.MAX_LENGTH) {
      throw new Error('Nameの文字数が不正です');
    }

    // 空白だけの入力を弾く
    if (value.trim().length === 0) {
      throw new Error('Nameの形式が不正です');
    }
  }
}
