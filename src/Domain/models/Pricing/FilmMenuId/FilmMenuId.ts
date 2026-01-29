import { ValueObject } from 'Domain/models/shared/ValueObject';

/**
 * カーフィルム施工メニューを識別するID
 * 料金表の列に対応する固定値
 */
export class FilmMenuId extends ValueObject<string, 'FilmMenuId'> {
  private static readonly VALID_IDS = [
    'front-set',
    'front',
    'front-left-right',
    'rear-set',
    'rear-left-right',
    'quarter-left-right',
    'rear',
  ] as const;

  static readonly FRONT_SET = FilmMenuId.from('front-set');
  static readonly FRONT = FilmMenuId.from('front');
  static readonly FRONT_LEFT_RIGHT = FilmMenuId.from('front-left-right');
  static readonly REAR_SET = FilmMenuId.from('rear-set');
  static readonly REAR_LEFT_RIGHT = FilmMenuId.from('rear-left-right');
  static readonly QUARTER_LEFT_RIGHT = FilmMenuId.from('quarter-left-right');
  static readonly REAR = FilmMenuId.from('rear');

  static readonly ALL_MENUS = [
    FilmMenuId.FRONT_SET,
    FilmMenuId.FRONT,
    FilmMenuId.FRONT_LEFT_RIGHT,
    FilmMenuId.REAR_SET,
    FilmMenuId.REAR_LEFT_RIGHT,
    FilmMenuId.QUARTER_LEFT_RIGHT,
    FilmMenuId.REAR,
  ] as const;

  static from(value: string): FilmMenuId {
    return new FilmMenuId(value);
  }

  constructor(value: string) {
    super(value);
  }

  protected validate(value: string): void {
    if (!(FilmMenuId.VALID_IDS as readonly string[]).includes(value)) {
      throw new Error(`不正なFilmMenuId: ${value}`);
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
