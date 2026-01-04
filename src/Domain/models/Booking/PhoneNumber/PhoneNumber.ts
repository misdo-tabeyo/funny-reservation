import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * 電話番号
 * - 国内番号のみ許容
 * - 内部的には +81XXXXXXXXXX の形式（+81 + digits）で保持する
 */
export class PhoneNumber extends ValueObject<string, 'PhoneNumber'> {
  static readonly CANONICAL_MIN_LENGTH = 12;
  static readonly CANONICAL_MAX_LENGTH = 13;
  static readonly COUNTRY_CODE = '81';
  static readonly E164_LIKE = /^\+81\d{9,10}$/; // 日本: 国内(0除去後)が 9 or 10 桁

  // 携帯の国内表記
  static readonly MOBILE_DIGITS_PREFIX = /^(090|080|070|060|050)\d{8}$/;

  constructor(value: string) {
    super(PhoneNumber.normalize(value));
  }

  /**
   * 画面表示用
   * - 携帯だけハイフン
   * - 固定は digits のまま
   */
  toDisplay(): string {
    const domesticDigits = PhoneNumber.toDomesticDigits(this.value); // 0始まりdigits

    // 携帯番号だけハイフンあり表示
    if (PhoneNumber.MOBILE_DIGITS_PREFIX.test(domesticDigits)) {
      // 09012345678 -> 090-1234-5678
      return (
        domesticDigits.slice(0, 3) +
        '-' +
        domesticDigits.slice(3, 7) +
        '-' +
        domesticDigits.slice(7)
      );
    }

    // 固定電話などはハイフン無し
    return domesticDigits;
  }

  /**
   * 入力を canonical（+81 + digits）に正規化
   * - 受け入れ例:
   *   - 090-1234-5678
   *   - 09012345678
   *   - +81 90 1234 5678
   *   - +819012345678
   *   - (03)1234-5678
   * - 出力例:
   *   - +819012345678
   */
  static normalize(raw: string): string {
    const trimmed = raw.trim();

    // ハイフン/空白/括弧などを除去（+ は保持したいので先に処理する）
    const cleaned = trimmed
      .replace(/[()\s-]/g, '')
      .replace(/　/g, ''); // 全角スペース念のため

    // + がある場合（国際表記）
    if (cleaned.startsWith('+')) {
      // 日本(+81)のみ許容
      if (!cleaned.startsWith(`+${PhoneNumber.COUNTRY_CODE}`)) {
        throw new Error('日本の電話番号のみ対応しています');
      }

      // +81(0)90... -> +8190...
      return cleaned.replace(/^\+81(0)/, '+81');
    }

    // digits 以外が残ってたらNG
    if (!/^\d+$/.test(cleaned)) {
      throw new Error('不正なPhoneNumberの形式です');
    }

    // 0 始まりでなければNG
    if (!cleaned.startsWith('0')) {
      throw new Error('不正なPhoneNumberの形式です');
    }

    const national = cleaned.slice(1); // 先頭0を除去
    return `+${PhoneNumber.COUNTRY_CODE}${national}`;
  }

  /** canonical を国内表記（0始まりの digits）に変換
   * - +81XXXXXXXXXX -> 0XXXXXXXXXX
   */
  static toDomesticDigits(canonical: string): string {
    const national = canonical.replace(/^\+81/, '');
    return `0${national}`;
  }

  protected validate(value: string): void {
    // canonical の構文チェック（まず軽いチェックを先に）
    if (value.length < PhoneNumber.CANONICAL_MIN_LENGTH || value.length > PhoneNumber.CANONICAL_MAX_LENGTH) {
      // 異常な巨大入力を弾く（記事の「先に文字数」思想）
      throw new Error('PhoneNumberの文字数が不正です');
    }

    if (!PhoneNumber.E164_LIKE.test(value)) {
      throw new Error('不正なPhoneNumberの形式です');
    }
  }
}
