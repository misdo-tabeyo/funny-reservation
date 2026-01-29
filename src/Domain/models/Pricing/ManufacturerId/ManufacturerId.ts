import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * 自動車メーカーを識別するID
 */
export class ManufacturerId extends ValueObject<string, 'ManufacturerId'> {
  static readonly MIN_LENGTH = 1;
  static readonly MAX_LENGTH = 50;
  /**
   * 料金表（Google Sheets）ではメーカーごとにシートが分かれており、
   * シート名（例: "トヨタ", "レクサス" など）がそのまま識別子として十分。
   * 列構成を変えられない前提のため、メーカーIDも文字種制限はかけない。
   */
  static readonly FORBIDDEN_CHARS = /[\u0000-\u001f\u007f]/; // 制御文字は不可

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    const trimmed = value.trim();
    if (trimmed.length < ManufacturerId.MIN_LENGTH || trimmed.length > ManufacturerId.MAX_LENGTH) {
      throw new Error('ManufacturerIdの文字数が不正です');
    }

    if (ManufacturerId.FORBIDDEN_CHARS.test(value)) {
      throw new Error('不正なManufacturerIdの形式です（制御文字は使用できません）');
    }
  }

  /**
   * メーカーIDに対応する日本語表示名を取得
   */
  getDisplayName(): string {
    // ID をそのまま表示名として返す（= シート名を表示名として扱う）
    return this.value;
  }
}
