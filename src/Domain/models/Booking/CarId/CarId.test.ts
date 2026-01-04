import { CarId } from './CarId';

jest.mock('nanoid', () => ({
  nanoid: () => 'Abcdefghij_1234567890-ABCDE', // 10〜50 & URL-safe
}));

describe('CarId', () => {
  // 正常系
  test('有効なフォーマットの場合 canonical が生成される', () => {
    expect(new CarId('Abcdefghij').value).toBe('Abcdefghij');
    expect(new CarId('Abcdefghij_1234567890-ABCDE').value).toBe('Abcdefghij_1234567890-ABCDE');
  });

  test('equals', () => {
    const a = new CarId('Abcdefghij');
    const b = new CarId('Abcdefghij');
    const c = new CarId('Kbcdefghij');
    expect(a.equals(b)).toBeTruthy();
    expect(a.equals(c)).toBeFalsy();
  });

  test('generate()', () => {
    expect(CarId.generate().value).toBe('Abcdefghij_1234567890-ABCDE');
  });

  // 異常系
  test('不正な文字数の場合にエラーを投げる', () => {
    expect(() => new CarId('a'.repeat(9))).toThrow('CarIdの文字数が不正です');
    expect(() => new CarId('a'.repeat(51))).toThrow('CarIdの文字数が不正です');
  });

  test('不正なフォーマットの場合にエラーを投げる', () => {
    expect(() => new CarId('abcdefghij!')).toThrow('不正なCarIdの形式です');
  });
});
