import { ValueObject } from 'Domain/models/shared/ValueObject';
import { nanoid } from 'nanoid';

export class OptionId extends ValueObject<string, 'OptionId'> {
  static readonly MIN_LENGTH = 10;
  static readonly MAX_LENGTH = 50;
  static readonly FORMAT = /^[a-zA-Z0-9_-]+$/;

  constructor(value: string) {
    super(value);
  }

  static generate(): OptionId {
    return new OptionId(nanoid());
  }

  protected validate(value: string): void {
    if (value.length < OptionId.MIN_LENGTH || value.length > OptionId.MAX_LENGTH) {
      throw new Error('OptionIdの文字数が不正です');
    }

    if (!OptionId.FORMAT.test(value)) {
      throw new Error('不正なOptionIdの形式です');
    }
  }
}
