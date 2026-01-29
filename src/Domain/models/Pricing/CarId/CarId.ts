import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * 車種を識別するID
 * 料金表の車種IDとして使用（例: "toyota-prius", "lexus-rx"）
 */
export class CarId extends ValueObject<string, 'CarId'> {
  static readonly MIN_LENGTH = 1;
  static readonly MAX_LENGTH = 100;
  static readonly FORMAT = /^[a-z0-9-]+$/; // 小文字英数字とハイフンのみ

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    if (value.length < CarId.MIN_LENGTH || value.length > CarId.MAX_LENGTH) {
      throw new Error('CarIdの文字数が不正です');
    }

    if (!CarId.FORMAT.test(value)) {
      throw new Error('不正なCarIdの形式です（小文字英数字とハイフンのみ使用可能）');
    }
  }

  /**
   * メーカー名と車種名から CarId を生成
   * @param manufacturer - メーカー名（例: "トヨタ"）
   * @param carName - 車種名（例: "プリウス"）
   * @returns CarId（例: "toyota-prius"）
   */
  static fromNames(manufacturer: string, carName: string): CarId {
    const manufacturerSlug = this.toSlug(manufacturer);
    const carNameSlug = this.toSlug(carName);
    return new CarId(`${manufacturerSlug}-${carNameSlug}`);
  }

  /**
   * 日本語の文字列をスラッグ（URL safe）に変換
   */
  private static toSlug(text: string): string {
    // よく使われる日本語→ローマ字のマッピング
    const romanMap: Record<string, string> = {
      // メーカー
      トヨタ: 'toyota',
      レクサス: 'lexus',
      ホンダ: 'honda',
      日産: 'nissan',
      マツダ: 'mazda',
      スバル: 'subaru',
      スズキ: 'suzuki',
      ダイハツ: 'daihatsu',
      三菱: 'mitsubishi',

      // 主要車種（トヨタ）
      プリウス: 'prius',
      アルファード: 'alphard',
      ヴェルファイア: 'vellfire',
      クラウン: 'crown',
      カローラ: 'corolla',
      ハリアー: 'harrier',
      ランドクルーザー: 'land-cruiser',
      アクア: 'aqua',
      ヤリス: 'yaris',
      ノア: 'noah',
      ヴォクシー: 'voxy',
      シエンタ: 'sienta',
      ライズ: 'raize',

      // レクサス
      RX: 'rx',
      NX: 'nx',
      UX: 'ux',
      LS: 'ls',
      ES: 'es',
      IS: 'is',
      CT: 'ct',
      LX: 'lx',
      RC: 'rc',
      LC: 'lc',
    };

    // マッピングに存在する場合はそれを使用
    if (romanMap[text]) {
      return romanMap[text];
    }

    // マッピングにない場合は、小文字化してスペース/特殊文字をハイフンに
    return text
      .toLowerCase()
      .trim()
      .replace(/[\s\u3000]+/g, '-') // スペース・全角スペースをハイフンに
      .replace(/[^\w\-]/g, '') // 英数字とハイフン以外を削除
      .replace(/-+/g, '-') // 連続するハイフンを1つに
      .replace(/^-|-$/g, ''); // 前後のハイフンを削除
  }
}
