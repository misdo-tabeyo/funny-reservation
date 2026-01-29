import { MenuId } from './MenuId';

describe('MenuId', () => {
  // 正常系
  test('有効なメニューIDの場合 canonical が生成される', () => {
    expect(new MenuId('front-set').value).toBe('front-set');
    expect(new MenuId('rear-set').value).toBe('rear-set');
  });

  test('equals', () => {
    const a = new MenuId('front-set');
    const b = new MenuId('front-set');
    const c = new MenuId('rear-set');
    expect(a.equals(b)).toBeTruthy();
    expect(a.equals(c)).toBeFalsy();
  });

  test('静的定数メニューが正しく定義されている', () => {
    expect(MenuId.FRONT_SET.value).toBe('front-set');
    expect(MenuId.FRONT.value).toBe('front');
    expect(MenuId.FRONT_LEFT_RIGHT.value).toBe('front-left-right');
    expect(MenuId.REAR_SET.value).toBe('rear-set');
    expect(MenuId.REAR_LEFT_RIGHT.value).toBe('rear-left-right');
    expect(MenuId.QUARTER_LEFT_RIGHT.value).toBe('quarter-left-right');
    expect(MenuId.REAR.value).toBe('rear');
  });

  test('ALL_MENUS に全メニューが含まれる', () => {
    expect(MenuId.ALL_MENUS).toHaveLength(7);
    expect(MenuId.ALL_MENUS).toContain(MenuId.FRONT_SET);
    expect(MenuId.ALL_MENUS).toContain(MenuId.FRONT);
    expect(MenuId.ALL_MENUS).toContain(MenuId.FRONT_LEFT_RIGHT);
    expect(MenuId.ALL_MENUS).toContain(MenuId.REAR_SET);
    expect(MenuId.ALL_MENUS).toContain(MenuId.REAR_LEFT_RIGHT);
    expect(MenuId.ALL_MENUS).toContain(MenuId.QUARTER_LEFT_RIGHT);
    expect(MenuId.ALL_MENUS).toContain(MenuId.REAR);
  });

  test('getDisplayName() - 表示名を取得', () => {
    expect(MenuId.FRONT_SET.getDisplayName()).toBe('フロントセット');
    expect(MenuId.FRONT.getDisplayName()).toBe('フロント');
    expect(MenuId.FRONT_LEFT_RIGHT.getDisplayName()).toBe('フロント左右');
    expect(MenuId.REAR_SET.getDisplayName()).toBe('リアセット');
    expect(MenuId.REAR_LEFT_RIGHT.getDisplayName()).toBe('リア左右');
    expect(MenuId.QUARTER_LEFT_RIGHT.getDisplayName()).toBe('クォーター左右');
    expect(MenuId.REAR.getDisplayName()).toBe('リア');
  });

  test('getDisplayOrder() - 表示順序を取得', () => {
    expect(MenuId.FRONT_SET.getDisplayOrder()).toBe(1);
    expect(MenuId.FRONT.getDisplayOrder()).toBe(2);
    expect(MenuId.FRONT_LEFT_RIGHT.getDisplayOrder()).toBe(3);
    expect(MenuId.REAR_SET.getDisplayOrder()).toBe(4);
    expect(MenuId.REAR_LEFT_RIGHT.getDisplayOrder()).toBe(5);
    expect(MenuId.QUARTER_LEFT_RIGHT.getDisplayOrder()).toBe(6);
    expect(MenuId.REAR.getDisplayOrder()).toBe(7);
  });

  // 異常系
  test('不正なMenuIdの場合にエラーを投げる', () => {
    expect(() => new MenuId('invalid-menu')).toThrow('不正なMenuId: invalid-menu');
    expect(() => new MenuId('front')).not.toThrow(); // 有効なメニューID
    expect(() => new MenuId('FRONT-SET')).toThrow('不正なMenuId: FRONT-SET');
  });
});
