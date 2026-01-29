import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * カーフィルム施工メニューを識別するID
 * 料金表のメニューIDと同じ形式（例: "front-set", "rear-set"）
 *
 * 注: 以前は nanoid() で生成していたが、料金表との統合のため
 * Pricing ドメインと同じ固定値形式に変更
 */
export class MenuId extends ValueObject<string, 'MenuId'> {
  // 定数として定義（料金表の列に対応）
  static readonly FRONT_SET = new MenuId('front-set');
  static readonly FRONT = new MenuId('front');
  static readonly FRONT_LEFT_RIGHT = new MenuId('front-left-right');
  static readonly REAR_SET = new MenuId('rear-set');
  static readonly REAR_LEFT_RIGHT = new MenuId('rear-left-right');
  static readonly QUARTER_LEFT_RIGHT = new MenuId('quarter-left-right');
  static readonly REAR = new MenuId('rear');

  static readonly ALL_MENUS = [
    MenuId.FRONT_SET,
    MenuId.FRONT,
    MenuId.FRONT_LEFT_RIGHT,
    MenuId.REAR_SET,
    MenuId.REAR_LEFT_RIGHT,
    MenuId.QUARTER_LEFT_RIGHT,
    MenuId.REAR,
  ] as const;

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    const validIds = [
      'front-set',
      'front',
      'front-left-right',
      'rear-set',
      'rear-left-right',
      'quarter-left-right',
      'rear',
    ];
    if (!validIds.includes(value)) {
      throw new Error(`不正なMenuId: ${value}`);
    }
  }

  /**
   * メニューIDに対応する日本語表示名を取得
   */
  getDisplayName(): string {
    const names: Record<string, string> = {
      'front-set': 'フロントセット',
      front: 'フロント',
      'front-left-right': 'フロント左右',
      'rear-set': 'リアセット',
      'rear-left-right': 'リア左右',
      'quarter-left-right': 'クォーター左右',
      rear: 'リア',
    };
    return names[this.value] ?? this.value;
  }

  /**
   * 表示順序を取得（料金表の列順に対応）
   */
  getDisplayOrder(): number {
    const order: Record<string, number> = {
      'front-set': 1,
      front: 2,
      'front-left-right': 3,
      'rear-set': 4,
      'rear-left-right': 5,
      'quarter-left-right': 6,
      rear: 7,
    };
    return order[this.value] ?? 999;
  }
}
