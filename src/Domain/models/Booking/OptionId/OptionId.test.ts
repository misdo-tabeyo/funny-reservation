import { OptionId } from './OptionId';

jest.mock('nanoid', () => ({
  nanoid: () => 'Abcdefghij_1234567890-ABCDE',
}));

describe('OptionId', () => {
  // 正常系
  test('有効なフォーマットの場合 canonical が生成される', () => {
    expect(new OptionId('Abcdefghij').value).toBe('Abcdefghij');
  });

  test('equals', () => {
    const a = new OptionId('Abcdefghij');
    const b = new OptionId('Abcdefghij');
    const c = new OptionId('Kbcdefghij');
    expect(a.equals(b)).toBeTruthy();
    expect(a.equals(c)).toBeFalsy();
  });

  test('generate()', () => {
    expect(OptionId.generate().value).toBe('Abcdefghij_1234567890-ABCDE');
  });

  // 異常系
  test('不正な文字数の場合にエラーを投げる', () => {
    expect(() => new OptionId('a'.repeat(9))).toThrow('OptionIdの文字数が不正です');
    expect(() => new OptionId('a'.repeat(51))).toThrow('OptionIdの文字数が不正です');
  });

  test('不正なフォーマットの場合にエラーを投げる', () => {
    expect(() => new OptionId('abcdefghij!')).toThrow('不正なOptionIdの形式です');
  });
});
