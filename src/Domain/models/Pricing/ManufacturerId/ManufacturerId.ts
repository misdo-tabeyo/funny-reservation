import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * 自動車メーカーを識別するID
 */
export class ManufacturerId extends ValueObject<string, 'ManufacturerId'> {
  static readonly MIN_LENGTH = 1;
  static readonly MAX_LENGTH = 50;
  static readonly FORMAT = /^[a-z0-9-]+$/; // 小文字英数字とハイフンのみ

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    if (value.length < ManufacturerId.MIN_LENGTH || value.length > ManufacturerId.MAX_LENGTH) {
      throw new Error('ManufacturerIdの文字数が不正です');
    }

    if (!ManufacturerId.FORMAT.test(value)) {
      throw new Error('不正なManufacturerIdの形式です（小文字英数字とハイフンのみ使用可能）');
    }
  }

  /**
   * 日本語のメーカー名からIDを生成
   * @param name - メーカー名（例: "トヨタ"）
   * @returns ManufacturerId（例: "toyota"）
   */
  static fromName(name: string): ManufacturerId {
    const map: Record<string, string> = {
      トヨタ: 'toyota',
      レクサス: 'lexus',
      ホンダ: 'honda',
      日産: 'nissan',
      マツダ: 'mazda',
      スバル: 'subaru',
      スズキ: 'suzuki',
      ダイハツ: 'daihatsu',
      三菱: 'mitsubishi',
    };

    const id = map[name];
    if (!id) {
      throw new Error(`未対応のメーカー名: ${name}`);
    }

    return new ManufacturerId(id);
  }

  /**
   * メーカーIDに対応する日本語表示名を取得
   */
  getDisplayName(): string {
    const names: Record<string, string> = {
      toyota: 'トヨタ',
      lexus: 'レクサス',
      honda: 'ホンダ',
      nissan: '日産',
      mazda: 'マツダ',
      subaru: 'スバル',
      suzuki: 'スズキ',
      daihatsu: 'ダイハツ',
      mitsubishi: '三菱',
    };
    return names[this.value] ?? this.value;
  }
}
