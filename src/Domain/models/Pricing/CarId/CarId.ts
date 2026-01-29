import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * 車種を識別するID
 * 料金表の車種IDとして使用（例: "toyota-prius", "lexus-rx"）
 */
export class CarId extends ValueObject<string, 'CarId'> {
  static readonly MIN_LENGTH = 1;
  static readonly MAX_LENGTH = 100;
  /**
   * 料金表（Google Sheets）の「車名」列をそのまま ID として扱えるようにするため、
   * 文字種制限はかけない。
   *
   * - 変更可能な前提（後方互換不要）
   * - 日本語/記号（例: "ヴィッツ(リア3角窓あり)", "タウンエース\n(リア・スライドガラスあり)"）を許容
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
