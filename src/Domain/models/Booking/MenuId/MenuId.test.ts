import { MenuId } from './MenuId';

jest.mock('nanoid', () => ({
  nanoid: () => 'Abcdefghij_1234567890-ABCDE',
}));

describe('MenuId', () => {
  // 正常系
  test('有効なフォーマットの場合 canonical が生成される', () => {
    expect(new MenuId('Abcdefghij').value).toBe('Abcdefghij');
  });

  test('equals', () => {
    const a = new MenuId('Abcdefghij');
    const b = new MenuId('Abcdefghij');
    const c = new MenuId('Kbcdefghij');
    expect(a.equals(b)).toBeTruthy();
    expect(a.equals(c)).toBeFalsy();
  });

  test('generate()', () => {
    expect(MenuId.generate().value).toBe('Abcdefghij_1234567890-ABCDE');
  });

  // 異常系
  test('不正な文字数の場合にエラーを投げる', () => {
    expect(() => new MenuId('a'.repeat(9))).toThrow('MenuIdの文字数が不正です');
    expect(() => new MenuId('a'.repeat(51))).toThrow('MenuIdの文字数が不正です');
  });

  test('不正なフォーマットの場合にエラーを投げる', () => {
    expect(() => new MenuId('abcdefghij!')).toThrow('不正なMenuIdの形式です');
  });
});
