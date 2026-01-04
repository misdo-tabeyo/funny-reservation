import { ValueObject } from 'Domain/models/shared/ValueObject';
import { nanoid } from 'nanoid';

export class MenuId extends ValueObject<string, 'MenuId'> {
  static readonly MIN_LENGTH = 10;
  static readonly MAX_LENGTH = 50;
  static readonly FORMAT = /^[a-zA-Z0-9_-]+$/;

  constructor(value: string) {
    super(value);
  }

  static generate(): MenuId {
    return new MenuId(nanoid());
  }

  protected validate(value: string): void {
    if (value.length < MenuId.MIN_LENGTH || value.length > MenuId.MAX_LENGTH) {
      throw new Error('MenuIdの文字数が不正です');
    }

    if (!MenuId.FORMAT.test(value)) {
      throw new Error('不正なMenuIdの形式です');
    }
  }
}
