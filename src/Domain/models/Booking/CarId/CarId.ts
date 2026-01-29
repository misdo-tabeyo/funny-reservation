import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * 車種を識別するID
 * 料金表の車種IDと同じ形式（例: "toyota-prius", "lexus-rx"）
 *
 * 注: 以前は nanoid() で生成していたが、料金表との統合のため
 * Pricing ドメインと同じ形式に変更
 */
export class CarId extends ValueObject<string, 'CarId'> {
  static readonly MIN_LENGTH = 1;
  static readonly MAX_LENGTH = 100;
  /**
   * Pricing ドメイン（料金表）と同じく、ID は文字種制限をかけない。
   * 車名をそのまま ID として扱う運用を想定。
   */
  static readonly FORBIDDEN_CHARS = /[\u0000-\u001f\u007f]/; // 制御文字は不可

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    const trimmed = value.trim();
    if (trimmed.length < CarId.MIN_LENGTH || trimmed.length > CarId.MAX_LENGTH) {
      throw new Error('CarIdの文字数が不正です');
    }

    // trim 後では検知できない末尾改行などもあるため、元の value でチェックする
    if (CarId.FORBIDDEN_CHARS.test(value)) {
      throw new Error('不正なCarIdの形式です（制御文字は使用できません）');
    }
  }
}
