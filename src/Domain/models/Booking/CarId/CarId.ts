import { ValueObject } from 'Domain/models/shared/ValueObject';
import { nanoid } from 'nanoid';

export class CarId extends ValueObject<string, 'CarId'> {
  static readonly MIN_LENGTH = 10;
  static readonly MAX_LENGTH = 50;
  static readonly FORMAT = /^[a-zA-Z0-9_-]+$/;

  constructor(value: string) {
    super(value);
  }

  static generate(): CarId {
    return new CarId(nanoid());
  }

  protected validate(value: string): void {
    if (value.length < CarId.MIN_LENGTH || value.length > CarId.MAX_LENGTH) {
      throw new Error('CarIdの文字数が不正です');
    }

    if (!CarId.FORMAT.test(value)) {
      throw new Error('不正なCarIdの形式です');
    }
  }
}
