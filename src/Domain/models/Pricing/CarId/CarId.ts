import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * 車種を識別するID
 * 料金表の車種IDとして使用（例: "プリウス", "ヴィッツ(リア3角窓あり)"）
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
  /**
   * Google Sheets のセル内改行（\n）を許容したいので、全面的な制御文字禁止にはしない。
   *
   * - NUL(\u0000) はデータ破損/取り扱い事故の温床になりやすいので引き続き禁止
   * - DEL(\u007f) も禁止
   * - タブ/改行(\t, \n, \r)は、Google Sheets 側で車名を複数行表記する運用があり得るため許容
   */
  static readonly FORBIDDEN_CHARS = /[\u0000\u007f]/;

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    const trimmed = value.trim();
    if (trimmed.length < CarId.MIN_LENGTH || trimmed.length > CarId.MAX_LENGTH) {
      throw new Error('CarIdの文字数が不正です');
    }

    // trim 後では検知できない末尾の不可視文字などもあるため、元の value でチェックする
    if (CarId.FORBIDDEN_CHARS.test(value)) {
      throw new Error('不正なCarIdの形式です（制御文字は使用できません）');
    }
  }
}
